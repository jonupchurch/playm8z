import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, users } from "@/db/schema";
import type { ForumSearchParams } from "@/lib/validations/forum";

export type ForumThreadRow = {
  id: string;
  categoryId: string;
  authorHandle: string;
  authorAvatarColor: string | null;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  viewCount: number;
  likes: number;
  createdAt: Date;
  hot: boolean;
};

const MIN_HOT_REPLIES = 3;
const HOT_REPLIES_PER_HOUR = 0.5;

// research.md #3: "hot" is computed at read time, never stored --
// pinned always takes precedence (a thread is never shown as both).
// Floors age at 1 hour so a brand-new thread's first couple of replies
// can't spike the ratio to an artificial "hot" reading.
export function isHotThread(replyCount: number, createdAt: Date, pinned: boolean, now: number = Date.now()): boolean {
  if (pinned) return false;
  if (replyCount < MIN_HOT_REPLIES) return false;
  const ageHours = Math.max((now - createdAt.getTime()) / (1000 * 60 * 60), 1);
  return replyCount / ageHours >= HOT_REPLIES_PER_HOUR;
}

function buildConditions(filters: ForumSearchParams): SQL[] {
  // Excludes a moderator-removed thread (Admin Users 016's FR-009).
  const conditions: SQL[] = [isNull(forumThreads.removedAt)];

  if (filters.category !== "all") {
    conditions.push(eq(forumThreads.categoryId, filters.category));
  }

  const q = filters.q.trim();
  if (q) {
    const pattern = `%${q}%`;
    const keywordMatch = or(
      ilike(forumThreads.title, pattern),
      ilike(forumThreads.body, pattern),
      ilike(users.handle, pattern),
      sql`EXISTS (SELECT 1 FROM unnest(${forumThreads.tags}) AS tag WHERE tag ILIKE ${pattern})`,
    );
    if (keywordMatch) conditions.push(keywordMatch);
  }

  if (filters.sort === "unanswered") {
    conditions.push(eq(forumThreads.replyCount, 0));
  }

  return conditions;
}

// FR-003/FR-004: category + search combine with AND; pinned threads
// always sort first regardless of the selected sort (research.md #2 --
// server-side, URL-driven, Browse's precedent, since threads
// accumulate indefinitely unlike Home's small recent slice).
export async function searchThreads(filters: ForumSearchParams): Promise<ForumThreadRow[]> {
  const conditions = buildConditions(filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy =
    filters.sort === "top"
      ? [desc(forumThreads.pinned), desc(forumThreads.likes)]
      : [desc(forumThreads.pinned), desc(forumThreads.createdAt)];

  const rows = await db
    .select({
      id: forumThreads.id,
      categoryId: forumThreads.categoryId,
      authorHandle: users.handle,
      authorAvatarColor: users.avatarColor,
      title: forumThreads.title,
      body: forumThreads.body,
      tags: forumThreads.tags,
      pinned: forumThreads.pinned,
      locked: forumThreads.locked,
      replyCount: forumThreads.replyCount,
      viewCount: forumThreads.viewCount,
      likes: forumThreads.likes,
      createdAt: forumThreads.createdAt,
    })
    .from(forumThreads)
    .innerJoin(users, eq(forumThreads.authorId, users.id))
    .where(where)
    .orderBy(...orderBy);

  return rows.map((row) => ({
    ...row,
    authorHandle: row.authorHandle ?? "player",
    hot: isHotThread(row.replyCount, row.createdAt, row.pinned),
  }));
}

// FR-002: each category chip's count, independent of the current
// search/sort state -- matches the source wireframe's own behavior
// (counts are computed over the full thread set, not the filtered
// view).
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ categoryId: forumThreads.categoryId, count: sql<number>`count(*)::int` })
    .from(forumThreads)
    .groupBy(forumThreads.categoryId);

  return Object.fromEntries(rows.map((row) => [row.categoryId, row.count]));
}
