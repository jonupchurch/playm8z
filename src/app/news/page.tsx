import Link from "next/link";
import { newsFiltersSchema } from "@/lib/validations/news";
import { searchNews } from "@/lib/news/search-news";
import { NewsControls } from "@/components/news/news-controls";
import { FeaturedPost } from "@/components/news/featured-post";
import { NewsPostCard } from "@/components/news/news-post-card";
import { SubscribeStrip } from "@/components/news/subscribe-strip";

// FR-001: public, no login required. Category/search/page all live in
// the URL (research.md #1, Browse/Forum's precedent) since news posts
// accumulate indefinitely, unlike Home's small client-filtered slice.
export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const filters = newsFiltersSchema.parse(rawParams);
  const { featured, posts, hasMore } = await searchNews(filters);

  const nextPageParams = new URLSearchParams();
  if (filters.category !== "all") nextPageParams.set("category", filters.category);
  if (filters.q) nextPageParams.set("q", filters.q);
  nextPageParams.set("page", String(filters.page + 1));

  const isEmpty = posts.length === 0 && !featured;

  return (
    <main className="min-h-screen bg-bg text-text">
      <div
        className="border-b border-border"
        style={{ backgroundImage: "radial-gradient(circle at 25% -40%, rgba(255,107,26,0.1), transparent 60%)" }}
      >
        <div className="mx-auto max-w-290 px-8 pt-10 pb-7">
          <div className="mb-2.5 font-mono text-[11px] tracking-[0.28em] text-accent-2 uppercase">
            The latest from playm8z
          </div>
          <h1 className="text-[32px] font-bold tracking-tight">News &amp; updates</h1>
        </div>
      </div>

      <div className="mx-auto max-w-290 px-8 py-6.5 pb-20">
        <NewsControls />

        {featured && <FeaturedPost post={featured} />}

        {posts.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <NewsPostCard key={post.id} post={post} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <Link
                  href={`/news?${nextPageParams.toString()}`}
                  className="inline-block rounded-xl border border-border bg-surface-2 px-7 py-3 text-sm font-semibold text-text"
                >
                  Load more
                </Link>
              </div>
            )}
          </>
        )}

        {isEmpty && (
          <div className="rounded-2xl border border-dashed border-border py-18 text-center">
            <div className="mb-1.5 text-lg font-bold text-text">No posts here yet.</div>
            <p className="text-sm text-text-muted">Try another category.</p>
          </div>
        )}

        <SubscribeStrip />
      </div>
    </main>
  );
}
