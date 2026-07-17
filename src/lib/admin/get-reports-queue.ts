import { and, asc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, forumReplies, forumThreads, messages, postings, reports, users } from "@/db/schema";
import type { ReportsQueueFilter, ReportTargetType } from "@/lib/validations/admin-reports";
import { computeSeverity, meetsEscalationThreshold, reasonLabel, type Severity } from "@/lib/moderation/reason-severity";
import { getSettings } from "@/lib/settings/get-settings";
import { startOfToday } from "./activity-data";

export type ReportsQueueItem = {
  targetType: ReportTargetType;
  targetId: string;
  severity: Severity;
  needsBanReview: boolean;
  reason: string;
  reportCount: number;
  reporterHandle: string;
  reporterAvatarColor: string | null;
  reporterAvatarImage: string | null;
  reporterImage: string | null;
  note: string;
  createdAt: Date;
  ownerId: string;
  ownerHandle: string;
  ownerAvatarColor: string | null;
  ownerAvatarImage: string | null;
  ownerImage: string | null;
  context: string;
  snippet: string;
  // Only present for targetType === "forum" -- which of 018's two
  // tables this group's targetId actually belongs to (research.md #7).
  forumTargetType?: "forumThread" | "forumReply";
};

export type ReportsQueueStats = {
  openCount: number;
  highCount: number;
  resolvedTodayCount: number;
  avgResponseMinutes: number | null;
};

export type ReportsQueueResult = { stats: ReportsQueueStats; rows: ReportsQueueItem[] };

type ReportGroup = {
  targetType: ReportTargetType;
  targetId: string;
  reasons: string[];
  reportCount: number;
  representative: {
    reason: string;
    details: string | null;
    createdAt: Date;
    reporterHandle: string;
    reporterAvatarColor: string | null;
    reporterAvatarImage: string | null;
    reporterImage: string | null;
  };
};

// FR-002/FR-003/FR-004/research.md #1/#8: groups every open report by
// (targetType, targetId) -- one card per distinct target, not one per
// report row (a deliberate difference from 017's/018's own queues,
// which enumerate every report in their own drawers -- this feature's
// purpose is breadth-of-triage across four content kinds). The
// earliest-filed open report per group is the "representative"
// reporter/note; severity is the worst of every open report's reason
// in the group (research.md #6's corrected mapping). "Resolved today"/
// "avg response" (research.md #5) read the new `reports.resolvedAt`
// directly -- report-row-level stats, not grouped-target counts.
export async function getReportsQueue(filter: ReportsQueueFilter): Promise<ReportsQueueResult> {
  const [openReportRows, [resolvedTodayRow], [avgResponseRow], moderationSettings] = await Promise.all([
    db
      .select({
        targetType: reports.targetType,
        targetId: reports.targetId,
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
      .where(eq(reports.status, "open"))
      .orderBy(asc(reports.createdAt)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(reports)
      .where(and(isNotNull(reports.resolvedAt), gte(reports.resolvedAt, startOfToday()))),
    db
      .select({ avgMinutes: sql<number | null>`avg(extract(epoch from (${reports.resolvedAt} - ${reports.createdAt})) / 60)` })
      .from(reports)
      .where(isNotNull(reports.resolvedAt)),
    getSettings(),
  ]);

  const groups = new Map<string, ReportGroup>();
  for (const row of openReportRows) {
    const key = `${row.targetType}:${row.targetId}`;
    const reason = row.reason ?? "other";
    const existing = groups.get(key);
    if (existing) {
      existing.reasons.push(reason);
      existing.reportCount += 1;
    } else {
      groups.set(key, {
        targetType: row.targetType as ReportTargetType,
        targetId: row.targetId,
        reasons: [reason],
        reportCount: 1,
        representative: {
          reason,
          details: row.details,
          createdAt: row.createdAt,
          reporterHandle: row.reporterHandle ?? "player",
          reporterAvatarColor: row.reporterAvatarColor,
          reporterAvatarImage: row.reporterAvatarImage,
          reporterImage: row.reporterImage,
        },
      });
    }
  }

  const allGroups = [...groups.values()];
  const postingIds = allGroups.filter((g) => g.targetType === "posting").map((g) => g.targetId);
  const forumIds = allGroups.filter((g) => g.targetType === "forum").map((g) => g.targetId);
  const messageIds = allGroups.filter((g) => g.targetType === "message").map((g) => g.targetId);
  const userIds = allGroups.filter((g) => g.targetType === "user").map((g) => g.targetId);

  const [postingRows, threadRows, replyRows, messageRows, userRows] = await Promise.all([
    postingIds.length
      ? db
          .select({
            id: postings.id,
            game: postings.game,
            blurb: postings.blurb,
            hostId: postings.hostId,
            hostHandle: users.handle,
            hostAvatarColor: users.avatarColor,
            hostAvatarImage: users.avatarImage,
            hostImage: users.image,
          })
          .from(postings)
          .innerJoin(users, eq(postings.hostId, users.id))
          .where(inArray(postings.id, postingIds))
      : Promise.resolve([]),
    forumIds.length
      ? db
          .select({
            id: forumThreads.id,
            body: forumThreads.body,
            authorId: forumThreads.authorId,
            authorHandle: users.handle,
            authorAvatarColor: users.avatarColor,
            authorAvatarImage: users.avatarImage,
            authorImage: users.image,
          })
          .from(forumThreads)
          .innerJoin(users, eq(forumThreads.authorId, users.id))
          .where(inArray(forumThreads.id, forumIds))
      : Promise.resolve([]),
    forumIds.length
      ? db
          .select({
            id: forumReplies.id,
            body: forumReplies.body,
            authorId: forumReplies.authorId,
            authorHandle: users.handle,
            authorAvatarColor: users.avatarColor,
            authorAvatarImage: users.avatarImage,
            authorImage: users.image,
            threadTitle: forumThreads.title,
          })
          .from(forumReplies)
          .innerJoin(users, eq(forumReplies.authorId, users.id))
          .innerJoin(forumThreads, eq(forumReplies.threadId, forumThreads.id))
          .where(inArray(forumReplies.id, forumIds))
      : Promise.resolve([]),
    messageIds.length
      ? db
          .select({
            id: messages.id,
            body: messages.body,
            senderId: messages.senderId,
            senderHandle: users.handle,
            senderAvatarColor: users.avatarColor,
            senderAvatarImage: users.avatarImage,
            senderImage: users.image,
            isGroup: conversations.isGroup,
          })
          .from(messages)
          .leftJoin(users, eq(messages.senderId, users.id))
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(inArray(messages.id, messageIds))
      : Promise.resolve([]),
    userIds.length
      ? db
          .select({
            id: users.id,
            handle: users.handle,
            avatarColor: users.avatarColor,
            avatarImage: users.avatarImage,
            image: users.image,
            bio: users.bio,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : Promise.resolve([]),
  ]);

  const postingsById = new Map(postingRows.map((row) => [row.id, row]));
  const threadsById = new Map(threadRows.map((row) => [row.id, row]));
  const repliesById = new Map(replyRows.map((row) => [row.id, row]));
  const messagesById = new Map(messageRows.map((row) => [row.id, row]));
  const usersById = new Map(userRows.map((row) => [row.id, row]));

  const allRows: ReportsQueueItem[] = [];
  for (const group of allGroups) {
    const severity = computeSeverity(group.reasons, null);
    const base = {
      targetType: group.targetType,
      targetId: group.targetId,
      severity,
      needsBanReview: meetsEscalationThreshold(severity, moderationSettings.autoEscalateSeverity),
      reason: group.representative.reason,
      reportCount: group.reportCount,
      reporterHandle: group.representative.reporterHandle,
      reporterAvatarColor: group.representative.reporterAvatarColor,
      reporterAvatarImage: group.representative.reporterAvatarImage,
      reporterImage: group.representative.reporterImage,
      note: group.representative.details ?? reasonLabel(group.representative.reason),
      createdAt: group.representative.createdAt,
    };

    if (group.targetType === "posting") {
      const posting = postingsById.get(group.targetId);
      // Content already gone via a path that didn't also resolve this
      // report -- shouldn't normally happen (017's/018's own resolve
      // actions always resolve reports in the same transaction), but
      // skip defensively rather than crash the whole queue.
      if (!posting) continue;
      allRows.push({
        ...base,
        ownerId: posting.hostId,
        ownerHandle: posting.hostHandle ?? "player",
        ownerAvatarColor: posting.hostAvatarColor,
        ownerAvatarImage: posting.hostAvatarImage,
        ownerImage: posting.hostImage,
        context: `${posting.game} posting`,
        snippet: posting.blurb,
      });
    } else if (group.targetType === "forum") {
      const thread = threadsById.get(group.targetId);
      if (thread) {
        allRows.push({
          ...base,
          ownerId: thread.authorId,
          ownerHandle: thread.authorHandle ?? "player",
          ownerAvatarColor: thread.authorAvatarColor,
          ownerAvatarImage: thread.authorAvatarImage,
          ownerImage: thread.authorImage,
          context: "Thread",
          snippet: thread.body,
          forumTargetType: "forumThread",
        });
        continue;
      }
      const reply = repliesById.get(group.targetId);
      if (!reply) continue;
      allRows.push({
        ...base,
        ownerId: reply.authorId,
        ownerHandle: reply.authorHandle ?? "player",
        ownerAvatarColor: reply.authorAvatarColor,
        ownerAvatarImage: reply.authorAvatarImage,
        ownerImage: reply.authorImage,
        context: `Reply in "${reply.threadTitle}"`,
        snippet: reply.body,
        forumTargetType: "forumReply",
      });
    } else if (group.targetType === "message") {
      const message = messagesById.get(group.targetId);
      // No sender (a system message) means no reportable owner to
      // review/warn/ban -- skip, same defensive reasoning as above.
      if (!message || !message.senderId) continue;
      allRows.push({
        ...base,
        ownerId: message.senderId,
        ownerHandle: message.senderHandle ?? "player",
        ownerAvatarColor: message.senderAvatarColor,
        ownerAvatarImage: message.senderAvatarImage,
        ownerImage: message.senderImage,
        context: message.isGroup ? "Group message" : "Direct message",
        snippet: message.body,
      });
    } else {
      const user = usersById.get(group.targetId);
      if (!user) continue;
      allRows.push({
        ...base,
        ownerId: user.id,
        ownerHandle: user.handle ?? "player",
        ownerAvatarColor: user.avatarColor,
        ownerAvatarImage: user.avatarImage,
        ownerImage: user.image,
        context: "Profile",
        snippet: user.bio ?? "(No bio)",
      });
    }
  }

  allRows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const stats: ReportsQueueStats = {
    openCount: allRows.length,
    highCount: allRows.filter((row) => row.severity === "high").length,
    resolvedTodayCount: resolvedTodayRow.n,
    avgResponseMinutes: avgResponseRow.avgMinutes === null ? null : Math.round(avgResponseRow.avgMinutes),
  };

  const rows = filter === "all" ? allRows : allRows.filter((row) => row.targetType === filter);

  return { stats, rows };
}
