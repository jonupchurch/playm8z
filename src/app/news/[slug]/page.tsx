import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getNewsArticleBySlug, getNewsEngagement, getRelatedArticles } from "@/lib/news/get-news-article";
import { newsCoverStyle } from "@/lib/news/cover-style";
import { ReadingProgress } from "@/components/news/reading-progress";
import { ArticleHeader, ArticleTagsShare } from "@/components/news/article-header";
import { ArticleBody } from "@/components/news/article-body";
import { ArticleRelated } from "@/components/news/article-related";

// FR-001/FR-002: public -- no login required to view. A draft,
// not-yet-due scheduled, or nonexistent slug all show the same
// not-found response (Content Page/014's own "a draft is
// indistinguishable from nonexistent" precedent) -- getNewsArticleBySlug
// itself already collapses all three into a single `null`.
export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const article = await getNewsArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const session = await auth();
  let viewerId: string | null = null;
  if (session?.user?.email) {
    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.email, session.user.email));
    viewerId = viewer?.id ?? null;
  }

  const [engagement, related] = await Promise.all([
    getNewsEngagement(article.id, viewerId),
    getRelatedArticles(article.id),
  ]);

  return (
    <main className="grow bg-bg text-text">
      <ReadingProgress />

      <ArticleHeader
        newsPostId={article.id}
        title={article.title}
        category={article.category}
        publishedAt={article.publishedAt}
        readTimeMinutes={article.readTimeMinutes}
        isLoggedIn={viewerId !== null}
        initialLikeCount={engagement.likeCount}
        initialLiked={engagement.likedByViewer}
        initialSaved={engagement.savedByViewer}
      />

      <div className="mx-auto mb-2 max-w-225 px-8">
        <div
          className="h-70 rounded-[20px]"
          style={newsCoverStyle(article.cover)}
        />
      </div>

      <div className="mx-auto max-w-190 px-8 pt-7 pb-10">
        <ArticleBody body={article.body} />
        <ArticleTagsShare tags={article.tags} />
      </div>

      <ArticleRelated posts={related} />
    </main>
  );
}
