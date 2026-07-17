import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, forumReplies, forumThreads, reports, users } from "@/db/schema";
import type { ForumQueueFilter } from "@/lib/validations/admin-forum";
import { computeSeverity, meetsEscalationThreshold, type Severity } from "@/lib/moderation/reason-severity";
import { getSettings } from "@/lib/settings/get-settings";
import { startOfToday } from "./activity-data";

export type ForumQueueReport = { reason: string; reporterHandle: string };

export type ForumQueueItem = {
  id: string;
  type: "forumThread" | "forumReply";
  categoryId: string;
  threadTitle: string;
  content: string;
  authorId: string;
  authorHandle: string;
  authorAvatarColor: string | null;
  authorAvatarImage: string | null;
  authorImage: string | null;
  createdAt: Date;
  autoFlagReason: string | null;
  reports: ForumQueueReport[];
  severity: Severity;
  needsBanReview: boolean;
};

export type ForumQueueStats = {
  inQueue: number;
  reportedCount: number;
  flaggedCount: number;
  actionedToday: number;
};

export type ForumQueueResult = { stats: ForumQueueStats; rows: ForumQueueItem[] };

// FR-002/FR-003/FR-004/data-model.md's queue-membership formula: not
// removed, and either an open report or an unreviewed auto-flag. Same
// "both counts as reported only, never auto-flagged" rule as Admin
// Postings (017) -- spec.md's Edge Cases, matching the wireframe's own
// demo data (item #3 has both an auto-flag reason and open reports,
// but its own `kind` is 'reported'). "Actioned today" is the first
// live product-facing read of `auditEntries` (research.md #5), not a
// stored counter.
export async function getForumQueue(filter: ForumQueueFilter): Promise<ForumQueueResult> {
  const [threadRows, replyRows, openReportRows, [actionedTodayRow], moderationSettings] = await Promise.all([
    db
      .select({
        id: forumThreads.id,
        categoryId: forumThreads.categoryId,
        title: forumThreads.title,
        body: forumThreads.body,
        authorId: forumThreads.authorId,
        authorHandle: users.handle,
        authorAvatarColor: users.avatarColor,
        authorAvatarImage: users.avatarImage,
        authorImage: users.image,
        createdAt: forumThreads.createdAt,
        autoFlagReason: forumThreads.autoFlagReason,
        moderationReviewedAt: forumThreads.moderationReviewedAt,
      })
      .from(forumThreads)
      .innerJoin(users, eq(forumThreads.authorId, users.id))
      .where(isNull(forumThreads.removedAt)),
    db
      .select({
        id: forumReplies.id,
        body: forumReplies.body,
        authorId: forumReplies.authorId,
        authorHandle: users.handle,
        authorAvatarColor: users.avatarColor,
        authorAvatarImage: users.avatarImage,
        authorImage: users.image,
        createdAt: forumReplies.createdAt,
        autoFlagReason: forumReplies.autoFlagReason,
        moderationReviewedAt: forumReplies.moderationReviewedAt,
        threadCategoryId: forumThreads.categoryId,
        threadTitle: forumThreads.title,
      })
      .from(forumReplies)
      .innerJoin(users, eq(forumReplies.authorId, users.id))
      .innerJoin(forumThreads, eq(forumReplies.threadId, forumThreads.id))
      .where(isNull(forumReplies.removedAt)),
    db
      .select({ targetId: reports.targetId, reason: reports.reason, reporterHandle: users.handle })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(and(eq(reports.targetType, "forum"), eq(reports.status, "open"))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditEntries)
      .where(
        and(
          eq(auditEntries.category, "moderation"),
          inArray(auditEntries.targetType, ["forumThread", "forumReply"]),
          gte(auditEntries.createdAt, startOfToday()),
        ),
      ),
    getSettings(),
  ]);

  const reportsByTarget = new Map<string, ForumQueueReport[]>();
  for (const row of openReportRows) {
    const list = reportsByTarget.get(row.targetId) ?? [];
    list.push({ reason: row.reason ?? "other", reporterHandle: row.reporterHandle ?? "player" });
    reportsByTarget.set(row.targetId, list);
  }

  function decorate<T extends { id: string; autoFlagReason: string | null; moderationReviewedAt: Date | null }>(row: T) {
    const itemReports = reportsByTarget.get(row.id) ?? [];
    const hasOpenReport = itemReports.length > 0;
    const isUnreviewedAutoFlag = row.autoFlagReason !== null && row.moderationReviewedAt === null;
    const severity = computeSeverity(
      itemReports.map((r) => r.reason),
      row.autoFlagReason,
    );
    return {
      itemReports,
      hasOpenReport,
      isUnreviewedAutoFlag,
      severity,
      needsBanReview: meetsEscalationThreshold(severity, moderationSettings.autoEscalateSeverity),
    };
  }

  const threadItems = threadRows.map((row) => {
    const { itemReports, hasOpenReport, isUnreviewedAutoFlag, severity, needsBanReview } = decorate(row);
    return {
      id: row.id,
      type: "forumThread" as const,
      categoryId: row.categoryId,
      threadTitle: row.title,
      content: row.body,
      authorId: row.authorId,
      authorHandle: row.authorHandle ?? "player",
      authorAvatarColor: row.authorAvatarColor,
      authorAvatarImage: row.authorAvatarImage,
      authorImage: row.authorImage,
      createdAt: row.createdAt,
      autoFlagReason: row.autoFlagReason,
      reports: itemReports,
      severity,
      needsBanReview,
      hasOpenReport,
      isUnreviewedAutoFlag,
    };
  });

  const replyItems = replyRows.map((row) => {
    const { itemReports, hasOpenReport, isUnreviewedAutoFlag, severity, needsBanReview } = decorate(row);
    return {
      id: row.id,
      type: "forumReply" as const,
      categoryId: row.threadCategoryId,
      threadTitle: row.threadTitle,
      content: row.body,
      authorId: row.authorId,
      authorHandle: row.authorHandle ?? "player",
      authorAvatarColor: row.authorAvatarColor,
      authorAvatarImage: row.authorAvatarImage,
      authorImage: row.authorImage,
      createdAt: row.createdAt,
      autoFlagReason: row.autoFlagReason,
      reports: itemReports,
      severity,
      needsBanReview,
      hasOpenReport,
      isUnreviewedAutoFlag,
    };
  });

  const allQueueItems = [...threadItems, ...replyItems]
    .filter((item) => item.hasOpenReport || item.isUnreviewedAutoFlag)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const stats: ForumQueueStats = {
    inQueue: allQueueItems.length,
    reportedCount: allQueueItems.filter((item) => item.hasOpenReport).length,
    flaggedCount: allQueueItems.filter((item) => item.isUnreviewedAutoFlag && !item.hasOpenReport).length,
    actionedToday: actionedTodayRow.n,
  };

  const filtered = allQueueItems.filter((item) => {
    if (filter === "threads") return item.type === "forumThread";
    if (filter === "replies") return item.type === "forumReply";
    if (filter === "flagged") return item.isUnreviewedAutoFlag && !item.hasOpenReport;
    return true;
  });

  return {
    stats,
    rows: filtered.map((item) => ({
      id: item.id,
      type: item.type,
      categoryId: item.categoryId,
      threadTitle: item.threadTitle,
      content: item.content,
      authorId: item.authorId,
      authorHandle: item.authorHandle,
      authorAvatarColor: item.authorAvatarColor,
      authorAvatarImage: item.authorAvatarImage,
      authorImage: item.authorImage,
      createdAt: item.createdAt,
      autoFlagReason: item.autoFlagReason,
      reports: item.reports,
      severity: item.severity,
      needsBanReview: item.needsBanReview,
    })),
  };
}
