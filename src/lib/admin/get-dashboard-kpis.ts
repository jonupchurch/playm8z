import { eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, users } from "@/db/schema";
import { countDistinctUsersOnDay, getActiveUserRowsSince, startOfToday } from "./activity-data";

export type DashboardKpis = {
  totalUsers: number;
  activeToday: number;
  newSignupsToday: number;
  livePostings: number;
  openReports: number;
};

// FR-002/SC-001: five real-count KPIs, recalculated per request, never
// a stale or hardcoded snapshot. "Active today" is research.md #1's
// distinct-user union across five tables, not a presence system.
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const today = startOfToday();

  const [[totalUsersRow], [newSignupsRow], [livePostingsRow], [openReportsRow], activityRows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.createdAt, today)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(postings)
      .where(eq(postings.status, "open")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(reports)
      .where(eq(reports.status, "open")),
    getActiveUserRowsSince(today),
  ]);

  return {
    totalUsers: totalUsersRow.n,
    newSignupsToday: newSignupsRow.n,
    livePostings: livePostingsRow.n,
    openReports: openReportsRow.n,
    activeToday: countDistinctUsersOnDay(activityRows, today),
  };
}
