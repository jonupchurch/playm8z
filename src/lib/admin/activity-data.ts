import { gte } from "drizzle-orm";
import { db } from "@/db";
import { applications, forumReplies, forumThreads, messages, postings } from "@/db/schema";
import { isSameDay, startOfToday } from "@/lib/dates";

export type TimestampedRow = { createdAt: Date };
export type ActiveUserRow = { userId: string; createdAt: Date };

// research.md #1: "active" is any distinct user with a row in one of
// these five tables since `since` -- not a presence/last-seen system.
// Shared by get-dashboard-kpis.ts (today's total) and
// get-activity-chart.ts (per-day breakdown) so the exact same source
// list can't drift between the two.
export async function getActiveUserRowsSince(since: Date): Promise<ActiveUserRow[]> {
  const [hostRows, applicantRows, threadRows, replyRows, messageRows] = await Promise.all([
    db
      .select({ userId: postings.hostId, createdAt: postings.createdAt })
      .from(postings)
      .where(gte(postings.createdAt, since)),
    db
      .select({ userId: applications.applicantId, createdAt: applications.createdAt })
      .from(applications)
      .where(gte(applications.createdAt, since)),
    db
      .select({ userId: forumThreads.authorId, createdAt: forumThreads.createdAt })
      .from(forumThreads)
      .where(gte(forumThreads.createdAt, since)),
    db
      .select({ userId: forumReplies.authorId, createdAt: forumReplies.createdAt })
      .from(forumReplies)
      .where(gte(forumReplies.createdAt, since)),
    db
      .select({ userId: messages.senderId, createdAt: messages.createdAt })
      .from(messages)
      .where(gte(messages.createdAt, since)),
  ]);
  const rows = [...hostRows, ...applicantRows, ...threadRows, ...replyRows, ...messageRows];
  return rows.filter((row): row is ActiveUserRow => row.userId !== null);
}

// Local-calendar-day bucketing (not a SQL date_trunc/GROUP BY), matching this
// project's existing "today" convention. `isSameDay`/`startOfToday` live in the
// DB-free `@/lib/dates` (shared with client-safe filter-notifications.ts).
export function countOnDay(rows: TimestampedRow[], day: Date): number {
  return rows.filter((row) => isSameDay(row.createdAt, day)).length;
}

export function countDistinctUsersOnDay(rows: ActiveUserRow[], day: Date): number {
  return new Set(rows.filter((row) => isSameDay(row.createdAt, day)).map((row) => row.userId)).size;
}

export function last7Days(): Date[] {
  const start = startOfToday();
  start.setDate(start.getDate() - 6);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}
