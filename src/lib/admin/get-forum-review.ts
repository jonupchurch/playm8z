import { FALLBACK_HANDLE } from "@/lib/fallback-handle";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, reports, users, warnings } from "@/db/schema";
import { computeSeverity, type Severity } from "@/lib/moderation/reason-severity";
import type { ForumTargetType } from "@/lib/validations/admin-forum";

export type ForumReviewReport = { reason: string; reporterHandle: string };
export type ForumReviewContext = { authorHandle: string; content: string };

export type ForumReview = {
  id: string;
  type: ForumTargetType;
  categoryId: string;
  threadTitle: string;
  content: string;
  createdAt: Date;
  autoFlagReason: string | null;
  severity: Severity;
  reports: ForumReviewReport[];
  precedingContext: ForumReviewContext | null;
  authorId: string;
  authorHandle: string;
  authorAvatarColor: string | null;
  authorAvatarImage: string | null;
  authorImage: string | null;
  authorJoinedAt: Date;
  priorWarnings: number;
  forumPosts: number;
};

async function loadReports(targetId: string): Promise<ForumReviewReport[]> {
  const rows = await db
    .select({ reason: reports.reason, reporterHandle: users.handle })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(and(eq(reports.targetType, "forum"), eq(reports.targetId, targetId), eq(reports.status, "open")));
  return rows.map((row) => ({ reason: row.reason ?? "other", reporterHandle: row.reporterHandle ?? FALLBACK_HANDLE }));
}

// "Prior warnings" spans the generalized, cross-feature `warnings`
// table regardless of source (posting/thread/reply) -- a user warned
// from Admin Postings and Admin Forum accumulates one combined count.
// "Forum posts" (distinct from Admin Postings' "total posts") counts
// this author's forumThreads + forumReplies rows.
async function loadAuthorCard(authorId: string) {
  const [[author], [warningsRow], [threadCountRow], [replyCountRow]] = await Promise.all([
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
      .where(eq(users.id, authorId)),
    db.select({ n: sql<number>`count(*)::int` }).from(warnings).where(eq(warnings.userId, authorId)),
    db.select({ n: sql<number>`count(*)::int` }).from(forumThreads).where(eq(forumThreads.authorId, authorId)),
    db.select({ n: sql<number>`count(*)::int` }).from(forumReplies).where(eq(forumReplies.authorId, authorId)),
  ]);
  return { author, priorWarnings: warningsRow.n, forumPosts: threadCountRow.n + replyCountRow.n };
}

// FR-006: the drawer's full content, "why it's here," the in-context
// preceding message for a reply (research.md #1's target classification
// doesn't apply here since the caller already knows targetType), and
// the author's join info/combined prior-warnings/forum-posts counts.
export async function getForumReview(targetType: ForumTargetType, targetId: string): Promise<ForumReview | null> {
  if (targetType === "forumThread") {
    const [thread] = await db
      .select({
        id: forumThreads.id,
        categoryId: forumThreads.categoryId,
        title: forumThreads.title,
        body: forumThreads.body,
        createdAt: forumThreads.createdAt,
        autoFlagReason: forumThreads.autoFlagReason,
        authorId: forumThreads.authorId,
      })
      .from(forumThreads)
      .where(eq(forumThreads.id, targetId));
    if (!thread) return null;

    const [itemReports, { author, priorWarnings, forumPosts }] = await Promise.all([
      loadReports(targetId),
      loadAuthorCard(thread.authorId),
    ]);

    return {
      id: thread.id,
      type: "forumThread",
      categoryId: thread.categoryId,
      threadTitle: thread.title,
      content: thread.body,
      createdAt: thread.createdAt,
      autoFlagReason: thread.autoFlagReason,
      severity: computeSeverity(
        itemReports.map((r) => r.reason),
        thread.autoFlagReason,
      ),
      reports: itemReports,
      precedingContext: null,
      authorId: author.id,
      authorHandle: author.handle ?? FALLBACK_HANDLE,
      authorAvatarColor: author.avatarColor,
      authorAvatarImage: author.avatarImage,
      authorImage: author.image,
      authorJoinedAt: author.createdAt,
      priorWarnings,
      forumPosts,
    };
  }

  const [reply] = await db
    .select({
      id: forumReplies.id,
      threadId: forumReplies.threadId,
      body: forumReplies.body,
      createdAt: forumReplies.createdAt,
      autoFlagReason: forumReplies.autoFlagReason,
      authorId: forumReplies.authorId,
    })
    .from(forumReplies)
    .where(eq(forumReplies.id, targetId));
  if (!reply) return null;

  const [thread] = await db
    .select({ categoryId: forumThreads.categoryId, title: forumThreads.title, body: forumThreads.body, authorId: forumThreads.authorId })
    .from(forumThreads)
    .where(eq(forumThreads.id, reply.threadId));

  const [[precedingReply], itemReports, { author, priorWarnings, forumPosts }] = await Promise.all([
    db
      .select({ authorHandle: users.handle, body: forumReplies.body })
      .from(forumReplies)
      .innerJoin(users, eq(forumReplies.authorId, users.id))
      .where(and(eq(forumReplies.threadId, reply.threadId), lt(forumReplies.createdAt, reply.createdAt)))
      .orderBy(desc(forumReplies.createdAt))
      .limit(1),
    loadReports(targetId),
    loadAuthorCard(reply.authorId),
  ]);

  // A reply's own immediately-preceding message: the reply just before
  // it in that thread, or (this being the thread's first reply) the
  // thread's own OP (research.md's spec.md Edge Cases).
  let precedingContext: ForumReviewContext;
  if (precedingReply) {
    precedingContext = { authorHandle: precedingReply.authorHandle ?? FALLBACK_HANDLE, content: precedingReply.body };
  } else {
    const [opAuthor] = await db.select({ handle: users.handle }).from(users).where(eq(users.id, thread.authorId));
    precedingContext = { authorHandle: opAuthor?.handle ?? FALLBACK_HANDLE, content: thread.body };
  }

  return {
    id: reply.id,
    type: "forumReply",
    categoryId: thread.categoryId,
    threadTitle: thread.title,
    content: reply.body,
    createdAt: reply.createdAt,
    autoFlagReason: reply.autoFlagReason,
    severity: computeSeverity(
      itemReports.map((r) => r.reason),
      reply.autoFlagReason,
    ),
    reports: itemReports,
    precedingContext,
    authorId: author.id,
    authorHandle: author.handle ?? FALLBACK_HANDLE,
    authorAvatarColor: author.avatarColor,
    authorAvatarImage: author.avatarImage,
    authorImage: author.image,
    authorJoinedAt: author.createdAt,
    priorWarnings,
    forumPosts,
  };
}
