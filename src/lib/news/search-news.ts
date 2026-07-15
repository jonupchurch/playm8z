import { and, desc, eq, ilike, lte, ne, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import type { NewsFilters } from "@/lib/validations/news";

export type NewsPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover: string | null;
  readTimeMinutes: number | null;
  upcoming: boolean;
  publishedAt: Date;
};

export type NewsResult = {
  featured: NewsPostRow | null;
  posts: NewsPostRow[];
  hasMore: boolean;
};

const PAGE_SIZE = 6;

const SELECT_COLUMNS = {
  id: newsPosts.id,
  slug: newsPosts.slug,
  title: newsPosts.title,
  excerpt: newsPosts.excerpt,
  category: newsPosts.category,
  cover: newsPosts.cover,
  readTimeMinutes: newsPosts.readTimeMinutes,
  upcoming: newsPosts.upcoming,
  publishedAt: newsPosts.publishedAt,
};

// Admin News (020) -- a post is actually live when it's published, or
// scheduled with a publish date/time that has already passed
// (research.md #3, computed at read time -- no background job ever
// flips a scheduled row's stored status). Every pre-020 row implicitly
// satisfies this (status defaults to 'draft' at the schema level, but
// every row that existed before this feature shipped was inserted by
// a seed script expecting immediate visibility -- those scripts are
// updated to pass `status: 'published'` explicitly alongside this
// amendment).
// Exported for News Article detail (023-news-article-detail) to reuse
// directly -- its own "is live" gate and "keep reading" query both
// need the exact same rule, not a second copy that could drift.
export function isLiveCondition(): SQL {
  return or(eq(newsPosts.status, "published"), and(eq(newsPosts.status, "scheduled"), lte(newsPosts.publishedAt, new Date()))) as SQL;
}

function buildConditions(filters: NewsFilters): SQL[] {
  const conditions: SQL[] = [isLiveCondition()];

  if (filters.category !== "all") {
    conditions.push(eq(newsPosts.category, filters.category));
  }

  const q = filters.q.trim();
  if (q) {
    const pattern = `%${q}%`;
    const keywordMatch = or(
      ilike(newsPosts.title, pattern),
      ilike(newsPosts.excerpt, pattern),
      ilike(newsPosts.category, pattern),
    );
    if (keywordMatch) conditions.push(keywordMatch);
  }

  return conditions;
}

// FR-002/FR-003/FR-004: the featured post shows only with no active
// category/search (research.md), excluded from the grid below it
// whenever it does. "Load more" is a cumulative fetch (LIMIT
// page*PAGE_SIZE) driven entirely by the URL's own page number, so a
// real server-rendered <Link> to the next page is enough -- no client
// state needed to "remember" already-loaded posts. Fetches one extra
// row to cheaply derive `hasMore` without a separate COUNT query.
export async function searchNews(filters: NewsFilters): Promise<NewsResult> {
  const showFeatured = filters.category === "all" && filters.q.trim().length === 0;

  let featured: NewsPostRow | null = null;
  if (showFeatured) {
    // Admin News (020) allows pinning a not-yet-live post (a draft or a
    // still-future scheduled one) -- the featured pick respects the
    // same live-check as the rest of the public feed, rather than
    // exempting it.
    const [row] = await db
      .select(SELECT_COLUMNS)
      .from(newsPosts)
      .where(and(eq(newsPosts.featured, true), isLiveCondition()))
      .limit(1);
    featured = row ?? null;
  }

  const conditions = buildConditions(filters);
  if (featured) {
    conditions.push(ne(newsPosts.id, featured.id));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const limit = filters.page * PAGE_SIZE;
  const rows = await db
    .select(SELECT_COLUMNS)
    .from(newsPosts)
    .where(where)
    .orderBy(desc(newsPosts.publishedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit);

  return { featured, posts, hasMore };
}
