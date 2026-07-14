import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings } from "@/db/schema";

export type TrendingGame = { game: string; count: number };

const TRENDING_LIMIT = 5;

// FR-007/SC-005: recalculated per request, never cached indefinitely --
// purely an aggregate over existing open Posting rows (ADR 0001: game
// is a free-text keyword, not a foreign key to a catalog table, so
// "trending" is never a separately-maintained leaderboard entity).
// Excludes a moderator-removed posting (Admin Users 016's removedAt;
// Admin Postings 017's research.md #6 -- this query predates that
// column and originally over-counted a removed-but-still-'open'
// posting, both here and in Admin Dashboard's get-top-games.ts, which
// reuses this query directly).
export async function getTrending(): Promise<TrendingGame[]> {
  return db
    .select({ game: postings.game, count: sql<number>`count(*)::int` })
    .from(postings)
    .where(and(eq(postings.status, "open"), isNull(postings.removedAt)))
    .groupBy(postings.game)
    .orderBy(desc(sql`count(*)`))
    .limit(TRENDING_LIMIT);
}
