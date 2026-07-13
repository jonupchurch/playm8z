import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings } from "@/db/schema";

export type TrendingGame = { game: string; count: number };

const TRENDING_LIMIT = 5;

// FR-007/SC-005: recalculated per request, never cached indefinitely --
// purely an aggregate over existing open Posting rows (ADR 0001: game
// is a free-text keyword, not a foreign key to a catalog table, so
// "trending" is never a separately-maintained leaderboard entity).
export async function getTrending(): Promise<TrendingGame[]> {
  return db
    .select({ game: postings.game, count: sql<number>`count(*)::int` })
    .from(postings)
    .where(eq(postings.status, "open"))
    .groupBy(postings.game)
    .orderBy(desc(sql`count(*)`))
    .limit(TRENDING_LIMIT);
}
