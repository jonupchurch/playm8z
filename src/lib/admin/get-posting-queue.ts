import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, users } from "@/db/schema";
import type { PostingQueueFilter } from "@/lib/validations/admin-postings";
import { startOfToday } from "./activity-data";
import { computeSeverity, type Severity } from "./posting-severity";

export type QueueReport = { reason: string; reporterHandle: string };

export type QueuePosting = {
  id: string;
  game: string;
  title: string;
  blurb: string;
  createdAt: Date;
  authorId: string;
  authorHandle: string;
  authorAvatarColor: string | null;
  autoFlagReason: string | null;
  reports: QueueReport[];
  severity: Severity;
};

export type PostingQueueStats = {
  inQueue: number;
  reportedCount: number;
  flaggedCount: number;
  removedToday: number;
};

export type PostingQueueResult = { stats: PostingQueueStats; rows: QueuePosting[] };

// FR-002/FR-003/FR-004/data-model.md's queue-membership formula: a
// posting qualifies when not removed and either has an open report or
// an unreviewed auto-flag. "Auto-flagged" narrows to the second case
// ONLY (spec.md's Edge Cases: a posting with both counts as
// User-reported, not Auto-flagged). Stats always reflect the
// unfiltered queue; "removed today" is separate -- any posting removed
// today regardless of queue membership (spec.md's own Edge Cases).
export async function getPostingQueue(filter: PostingQueueFilter): Promise<PostingQueueResult> {
  const [activePostings, openReportRows, [removedTodayRow]] = await Promise.all([
    db
      .select({
        id: postings.id,
        game: postings.game,
        title: postings.title,
        blurb: postings.blurb,
        createdAt: postings.createdAt,
        authorId: postings.hostId,
        authorHandle: users.handle,
        authorAvatarColor: users.avatarColor,
        autoFlagReason: postings.autoFlagReason,
        moderationReviewedAt: postings.moderationReviewedAt,
      })
      .from(postings)
      .innerJoin(users, eq(postings.hostId, users.id))
      .where(isNull(postings.removedAt))
      .orderBy(desc(postings.createdAt)),
    db
      .select({ targetId: reports.targetId, reason: reports.reason, reporterHandle: users.handle })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(and(eq(reports.targetType, "posting"), eq(reports.status, "open"))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(postings)
      .where(gte(postings.removedAt, startOfToday())),
  ]);

  const reportsByPosting = new Map<string, QueueReport[]>();
  for (const row of openReportRows) {
    const list = reportsByPosting.get(row.targetId) ?? [];
    list.push({ reason: row.reason ?? "other", reporterHandle: row.reporterHandle ?? "player" });
    reportsByPosting.set(row.targetId, list);
  }

  const allQueueRows = activePostings
    .map((posting) => {
      const postingReports = reportsByPosting.get(posting.id) ?? [];
      const hasOpenReport = postingReports.length > 0;
      const isUnreviewedAutoFlag = posting.autoFlagReason !== null && posting.moderationReviewedAt === null;
      return {
        id: posting.id,
        game: posting.game,
        title: posting.title,
        blurb: posting.blurb,
        createdAt: posting.createdAt,
        authorId: posting.authorId,
        authorHandle: posting.authorHandle ?? "player",
        authorAvatarColor: posting.authorAvatarColor,
        autoFlagReason: posting.autoFlagReason,
        reports: postingReports,
        severity: computeSeverity(
          postingReports.map((r) => r.reason),
          posting.autoFlagReason,
        ),
        hasOpenReport,
        isUnreviewedAutoFlag,
      };
    })
    .filter((row) => row.hasOpenReport || row.isUnreviewedAutoFlag);

  const stats: PostingQueueStats = {
    inQueue: allQueueRows.length,
    reportedCount: allQueueRows.filter((row) => row.hasOpenReport).length,
    flaggedCount: allQueueRows.filter((row) => row.isUnreviewedAutoFlag && !row.hasOpenReport).length,
    removedToday: removedTodayRow.n,
  };

  const filtered = allQueueRows.filter((row) => {
    if (filter === "reported") return row.hasOpenReport;
    if (filter === "flagged") return row.isUnreviewedAutoFlag && !row.hasOpenReport;
    return true;
  });

  return {
    stats,
    rows: filtered.map((row) => ({
      id: row.id,
      game: row.game,
      title: row.title,
      blurb: row.blurb,
      createdAt: row.createdAt,
      authorId: row.authorId,
      authorHandle: row.authorHandle,
      authorAvatarColor: row.authorAvatarColor,
      autoFlagReason: row.autoFlagReason,
      reports: row.reports,
      severity: row.severity,
    })),
  };
}
