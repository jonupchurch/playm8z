import { FALLBACK_HANDLE } from "@/lib/fallback-handle";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, forumReplies, forumThreads, messages, postings, reports, users, warnings } from "@/db/schema";
import { classifyForumTarget } from "@/lib/moderation/classify-forum-target";
import { computeSeverity, reasonLabel, type Severity } from "@/lib/moderation/reason-severity";
import type { ReportTargetType } from "@/lib/validations/admin-reports";

export type ReportReview = {
  targetType: ReportTargetType;
  targetId: string;
  severity: Severity;
  reason: string;
  reportCount: number;
  reporterHandle: string;
  reporterAvatarColor: string | null;
  reporterAvatarImage: string | null;
  reporterImage: string | null;
  note: string;
  othersCount: number;
  createdAt: Date;
  context: string;
  snippet: string;
  crossLinkHref: string | null;
  crossLinkLabel: string | null;
  ownerId: string;
  ownerHandle: string;
  ownerAvatarColor: string | null;
  ownerAvatarImage: string | null;
  ownerImage: string | null;
  ownerJoinedAt: Date;
  priorWarnings: number;
  totalReports: number;
  // Only present for targetType === "forum".
  forumTargetType?: "forumThread" | "forumReply";
};

// research.md #3: a lifetime, cross-source count -- direct profile
// reports, plus reports against every posting/thread/reply/message this
// user authored -- never a maintained counter. Two-step (fetch this
// user's own content ids, then count reports against them) rather than
// a nested subquery, matching this codebase's established pattern
// (get-forum-review.ts's loadAuthorCard).
async function getTotalReportsForUser(userId: string): Promise<number> {
  const [directRows, postingIdRows, threadIdRows, replyIdRows, messageIdRows] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(reports)
      .where(and(eq(reports.targetType, "user"), eq(reports.targetId, userId))),
    db.select({ id: postings.id }).from(postings).where(eq(postings.hostId, userId)),
    db.select({ id: forumThreads.id }).from(forumThreads).where(eq(forumThreads.authorId, userId)),
    db.select({ id: forumReplies.id }).from(forumReplies).where(eq(forumReplies.authorId, userId)),
    db.select({ id: messages.id }).from(messages).where(eq(messages.senderId, userId)),
  ]);

  const postingIds = postingIdRows.map((row) => row.id);
  const forumIds = [...threadIdRows.map((row) => row.id), ...replyIdRows.map((row) => row.id)];
  const messageIds = messageIdRows.map((row) => row.id);

  const [postingRows, forumRows, messageRows] = await Promise.all([
    postingIds.length
      ? db
          .select({ n: sql<number>`count(*)::int` })
          .from(reports)
          .where(and(eq(reports.targetType, "posting"), inArray(reports.targetId, postingIds)))
      : Promise.resolve([{ n: 0 }]),
    forumIds.length
      ? db
          .select({ n: sql<number>`count(*)::int` })
          .from(reports)
          .where(and(eq(reports.targetType, "forum"), inArray(reports.targetId, forumIds)))
      : Promise.resolve([{ n: 0 }]),
    messageIds.length
      ? db
          .select({ n: sql<number>`count(*)::int` })
          .from(reports)
          .where(and(eq(reports.targetType, "message"), inArray(reports.targetId, messageIds)))
      : Promise.resolve([{ n: 0 }]),
  ]);

  return directRows[0].n + postingRows[0].n + forumRows[0].n + messageRows[0].n;
}

async function loadOpenReports(targetType: ReportTargetType, targetId: string) {
  return db
    .select({
      reason: reports.reason,
      details: reports.details,
      createdAt: reports.createdAt,
      reporterHandle: users.handle,
      reporterAvatarColor: users.avatarColor,
      reporterAvatarImage: users.avatarImage,
      reporterImage: users.image,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(and(eq(reports.targetType, targetType), eq(reports.targetId, targetId), eq(reports.status, "open")))
    .orderBy(asc(reports.createdAt));
}

async function loadOwnerCard(ownerId: string) {
  const [[owner], [warningsRow], totalReports] = await Promise.all([
    db
      .select({
        id: users.id,
        handle: users.handle,
        avatarColor: users.avatarColor,
        avatarImage: users.avatarImage,
        image: users.image,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ownerId)),
    db.select({ n: sql<number>`count(*)::int` }).from(warnings).where(eq(warnings.userId, ownerId)),
    getTotalReportsForUser(ownerId),
  ]);
  return { owner, priorWarnings: warningsRow.n, totalReports };
}

// FR-005: the drawer's full content -- the representative reporter's
// note plus "+N others reported this," the reported content in
// context, a cross-link to that content's own dedicated moderation
// queue where one exists (research.md's own assumption: postings/
// forum/users have one; messages don't), and the reported user's
// join info/prior-warnings/all-time cross-source total-reports count.
export async function getReportReview(targetType: ReportTargetType, targetId: string): Promise<ReportReview | null> {
  const openReports = await loadOpenReports(targetType, targetId);
  if (openReports.length === 0) return null;

  const representative = openReports[0];
  const severity = computeSeverity(
    openReports.map((r) => r.reason ?? "other"),
    null,
  );
  const representativeReason = representative.reason ?? "other";
  const shared = {
    targetType,
    targetId,
    severity,
    reason: representativeReason,
    reportCount: openReports.length,
    reporterHandle: representative.reporterHandle ?? FALLBACK_HANDLE,
    reporterAvatarColor: representative.reporterAvatarColor,
    reporterAvatarImage: representative.reporterAvatarImage,
    reporterImage: representative.reporterImage,
    note: representative.details ?? reasonLabel(representativeReason),
    othersCount: openReports.length - 1,
    createdAt: representative.createdAt,
  };

  if (targetType === "posting") {
    const [posting] = await db
      .select({ id: postings.id, game: postings.game, blurb: postings.blurb, hostId: postings.hostId })
      .from(postings)
      .where(eq(postings.id, targetId));
    if (!posting) return null;

    const { owner, priorWarnings, totalReports } = await loadOwnerCard(posting.hostId);
    if (!owner) return null;

    return {
      ...shared,
      context: `${posting.game} posting`,
      snippet: posting.blurb,
      crossLinkHref: `/admin/postings?postingId=${targetId}`,
      crossLinkLabel: "Postings",
      ownerId: owner.id,
      ownerHandle: owner.handle ?? FALLBACK_HANDLE,
      ownerAvatarColor: owner.avatarColor,
      ownerAvatarImage: owner.avatarImage,
      ownerImage: owner.image,
      ownerJoinedAt: owner.createdAt,
      priorWarnings,
      totalReports,
    };
  }

  if (targetType === "forum") {
    const forumTargetType = await classifyForumTarget(targetId);
    if (!forumTargetType) return null;

    if (forumTargetType === "forumThread") {
      const [thread] = await db
        .select({ id: forumThreads.id, body: forumThreads.body, authorId: forumThreads.authorId })
        .from(forumThreads)
        .where(eq(forumThreads.id, targetId));
      if (!thread) return null;

      const { owner, priorWarnings, totalReports } = await loadOwnerCard(thread.authorId);
      if (!owner) return null;

      return {
        ...shared,
        context: "Thread",
        snippet: thread.body,
        crossLinkHref: `/admin/forum?targetType=forumThread&targetId=${targetId}`,
        crossLinkLabel: "Forum",
        ownerId: owner.id,
        ownerHandle: owner.handle ?? FALLBACK_HANDLE,
        ownerAvatarColor: owner.avatarColor,
        ownerAvatarImage: owner.avatarImage,
        ownerImage: owner.image,
        ownerJoinedAt: owner.createdAt,
        priorWarnings,
        totalReports,
        forumTargetType,
      };
    }

    const [reply] = await db
      .select({ id: forumReplies.id, body: forumReplies.body, authorId: forumReplies.authorId, threadId: forumReplies.threadId })
      .from(forumReplies)
      .where(eq(forumReplies.id, targetId));
    if (!reply) return null;

    const [[thread], { owner, priorWarnings, totalReports }] = await Promise.all([
      db.select({ title: forumThreads.title }).from(forumThreads).where(eq(forumThreads.id, reply.threadId)),
      loadOwnerCard(reply.authorId),
    ]);
    if (!owner) return null;

    return {
      ...shared,
      context: `Reply in "${thread?.title ?? ""}"`,
      snippet: reply.body,
      crossLinkHref: `/admin/forum?targetType=forumReply&targetId=${targetId}`,
      crossLinkLabel: "Forum",
      ownerId: owner.id,
      ownerHandle: owner.handle ?? FALLBACK_HANDLE,
      ownerAvatarColor: owner.avatarColor,
      ownerAvatarImage: owner.avatarImage,
      ownerImage: owner.image,
      ownerJoinedAt: owner.createdAt,
      priorWarnings,
      totalReports,
      forumTargetType,
    };
  }

  if (targetType === "message") {
    const [message] = await db
      .select({ id: messages.id, body: messages.body, senderId: messages.senderId, conversationId: messages.conversationId })
      .from(messages)
      .where(eq(messages.id, targetId));
    if (!message || !message.senderId) return null;

    const [[conversation], { owner, priorWarnings, totalReports }] = await Promise.all([
      db.select({ isGroup: conversations.isGroup }).from(conversations).where(eq(conversations.id, message.conversationId)),
      loadOwnerCard(message.senderId),
    ]);
    if (!owner) return null;

    return {
      ...shared,
      context: conversation?.isGroup ? "Group message" : "Direct message",
      snippet: message.body,
      // No dedicated moderation queue exists for messages (unlike
      // postings/forum/users) -- no cross-link (plan.md's assumption).
      crossLinkHref: null,
      crossLinkLabel: null,
      ownerId: owner.id,
      ownerHandle: owner.handle ?? FALLBACK_HANDLE,
      ownerAvatarColor: owner.avatarColor,
      ownerAvatarImage: owner.avatarImage,
      ownerImage: owner.image,
      ownerJoinedAt: owner.createdAt,
      priorWarnings,
      totalReports,
    };
  }

  // targetType === "user": the reported account itself is both the
  // content and the owner -- no separate removable object (FR-007).
  const { owner, priorWarnings, totalReports } = await loadOwnerCard(targetId);
  if (!owner) return null;

  return {
    ...shared,
    context: "Profile",
    snippet: (await db.select({ bio: users.bio }).from(users).where(eq(users.id, targetId)))[0]?.bio ?? "(No bio)",
    crossLinkHref: `/admin/users?userId=${targetId}`,
    crossLinkLabel: "Users",
    ownerId: owner.id,
    ownerHandle: owner.handle ?? FALLBACK_HANDLE,
    ownerAvatarColor: owner.avatarColor,
    ownerAvatarImage: owner.avatarImage,
    ownerImage: owner.image,
    ownerJoinedAt: owner.createdAt,
    priorWarnings,
    totalReports,
  };
}
