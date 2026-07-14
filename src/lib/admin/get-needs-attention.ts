import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { reports } from "@/db/schema";

export type NeedsAttention = {
  userReports: number;
  postingReview: number;
  forumReview: number;
};

async function openReportCount(targetType: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reports)
    .where(and(eq(reports.status, "open"), eq(reports.targetType, targetType)));
  return row.n;
}

// FR-005/research.md #2: three named queues, each a count of open
// `reports` rows for its own `targetType` -- no separate auto-flag or
// moderation-queue table. `message`-targeted reports exist in the
// schema but have no dashboard queue yet, per spec.md's exact three
// categories.
export async function getNeedsAttention(): Promise<NeedsAttention> {
  const [userReports, postingReview, forumReview] = await Promise.all([
    openReportCount("user"),
    openReportCount("posting"),
    openReportCount("forum"),
  ]);
  return { userReports, postingReview, forumReview };
}
