import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings } from "@/db/schema";

const SUGGESTION_LIMIT = 6;

// research.md #2: the same "most common game keyword among currently-
// open postings" aggregate Home's Trending and Browse's Game facet
// already compute, rather than a hand-maintained editorial list
// (ADR 0001 -- game is a free-text keyword, not a curated catalog).
export async function getGameSuggestions(): Promise<string[]> {
  const rows = await db
    .select({ game: postings.game, count: sql<number>`count(*)::int` })
    .from(postings)
    .where(eq(postings.status, "open"))
    .groupBy(postings.game)
    .orderBy(desc(sql`count(*)`))
    .limit(SUGGESTION_LIMIT);

  return rows.map((row) => row.game);
}
