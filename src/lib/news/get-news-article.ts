import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { likes, newsPosts, savedNewsPosts } from "@/db/schema";
import { isLiveCondition } from "@/lib/news/search-news";

const WORDS_PER_MINUTE = 200;
const RELATED_LIMIT = 3;

export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover: string | null;
  body: string;
  tags: string[];
  publishedAt: Date;
  readTimeMinutes: number;
};

export type RelatedArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover: string | null;
  publishedAt: Date;
};

// research.md #3: computed from the body's word count at render time,
// never read from `newsPosts.readTimeMinutes` (unused dead weight --
// no feature has ever populated it). Floored at 1 minute so real,
// non-empty published content never shows a nonsensical "0 min read."
export function computeReadTime(body: string): number {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

// FR-001/FR-002: a draft, not-yet-due scheduled, or nonexistent slug
// all return null here -- indistinguishable to the caller, which is
// exactly what lets page.tsx respond with the same not-found for all
// three (Content Page/014's own "a draft is indistinguishable from
// nonexistent" precedent).
export async function getNewsArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const [row] = await db
    .select({
      id: newsPosts.id,
      slug: newsPosts.slug,
      title: newsPosts.title,
      excerpt: newsPosts.excerpt,
      category: newsPosts.category,
      cover: newsPosts.cover,
      body: newsPosts.body,
      tags: newsPosts.tags,
      publishedAt: newsPosts.publishedAt,
      status: newsPosts.status,
    })
    .from(newsPosts)
    .where(eq(newsPosts.slug, slug));

  if (!row) return null;

  const isLive = row.status === "published" || (row.status === "scheduled" && row.publishedAt <= new Date());
  if (!isLive) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    cover: row.cover,
    body: row.body,
    tags: row.tags,
    publishedAt: row.publishedAt,
    readTimeMinutes: computeReadTime(row.body),
  };
}

export type NewsEngagement = { likeCount: number; likedByViewer: boolean; savedByViewer: boolean };

// FR-005: like count is computed (no denormalized column on `newsPosts`,
// unlike forumThreads'/forumReplies' own -- a single article page's
// own like count is cheap enough to count directly at read time,
// consistent with this project's "computed over stored" preference).
// `viewerId` is null for a logged-out visitor, who never has a liked/
// saved state.
export async function getNewsEngagement(newsPostId: string, viewerId: string | null): Promise<NewsEngagement> {
  const [likeCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(likes)
    .where(and(eq(likes.targetType, "newsPost"), eq(likes.targetId, newsPostId)));

  let likedByViewer = false;
  let savedByViewer = false;
  if (viewerId) {
    const [likedRow] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.userId, viewerId), eq(likes.targetType, "newsPost"), eq(likes.targetId, newsPostId)));
    likedByViewer = !!likedRow;

    const [savedRow] = await db
      .select({ id: savedNewsPosts.id })
      .from(savedNewsPosts)
      .where(and(eq(savedNewsPosts.userId, viewerId), eq(savedNewsPosts.newsPostId, newsPostId)));
    savedByViewer = !!savedRow;
  }

  return { likeCount: likeCountRow?.count ?? 0, likedByViewer, savedByViewer };
}

// FR-007/research.md #6: reuses News feed's (013) own "is live" gate
// and most-recent ordering -- up to 3 other currently-live articles,
// excluding the current one. Fewer than 3 (including zero) is a
// perfectly normal result, never padded with placeholder rows.
export async function getRelatedArticles(excludeId: string): Promise<RelatedArticle[]> {
  return db
    .select({
      id: newsPosts.id,
      slug: newsPosts.slug,
      title: newsPosts.title,
      excerpt: newsPosts.excerpt,
      category: newsPosts.category,
      cover: newsPosts.cover,
      publishedAt: newsPosts.publishedAt,
    })
    .from(newsPosts)
    .where(and(isLiveCondition(), ne(newsPosts.id, excludeId)))
    .orderBy(desc(newsPosts.publishedAt))
    .limit(RELATED_LIMIT);
}
