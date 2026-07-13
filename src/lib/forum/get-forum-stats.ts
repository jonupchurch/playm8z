import { sql } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, users } from "@/db/schema";

export type ForumStats = {
  memberCount: number;
  threadCount: number;
  trendingTags: string[];
};

const TRENDING_TAGS_LIMIT = 6;

// FR-006/SC-005: recalculated per request, same pattern as Home's
// Trending row and Browse's Game facet counts -- no stale/cached
// snapshot. "Online" is deliberately not part of this shape (spec's
// Edge Cases): no presence system exists anywhere in this project.
export async function getForumStats(): Promise<ForumStats> {
  const [{ memberCount }] = await db.select({ memberCount: sql<number>`count(*)::int` }).from(users);
  const [{ threadCount }] = await db.select({ threadCount: sql<number>`count(*)::int` }).from(forumThreads);

  const tagRows = await db.execute<{ tag: string; count: number }>(sql`
    SELECT tag, count(*)::int AS count
    FROM ${forumThreads}, unnest(${forumThreads.tags}) AS tag
    GROUP BY tag
    ORDER BY count(*) DESC
    LIMIT ${TRENDING_TAGS_LIMIT}
  `);

  return {
    memberCount,
    threadCount,
    trendingTags: tagRows.map((row) => row.tag),
  };
}
