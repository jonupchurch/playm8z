import { and, desc, eq, ilike, ne, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import type { NewsFilters } from "@/lib/validations/news";

export type NewsPostRow = {
  id: string;
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
  title: newsPosts.title,
  excerpt: newsPosts.excerpt,
  category: newsPosts.category,
  cover: newsPosts.cover,
  readTimeMinutes: newsPosts.readTimeMinutes,
  upcoming: newsPosts.upcoming,
  publishedAt: newsPosts.publishedAt,
};

function buildConditions(filters: NewsFilters): SQL[] {
  const conditions: SQL[] = [];

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
    const [row] = await db.select(SELECT_COLUMNS).from(newsPosts).where(eq(newsPosts.featured, true)).limit(1);
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
