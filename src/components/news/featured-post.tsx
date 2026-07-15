import Link from "next/link";
import { newsCategoryColor } from "@/lib/validations/news";
import { newsCoverStyle } from "@/lib/news/cover-style";
import type { NewsPostRow } from "@/lib/news/search-news";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// FR-002: shown only when no filter/search is active (page.tsx's own
// call site decides that, not this component). FR-011 (023-news-
// article-detail): now links to the article's own /news/{slug} --
// this feature's own bounded amendment, added once News article
// detail existed to link to.
export function FeaturedPost({ post }: { post: NewsPostRow }) {
  const color = newsCategoryColor(post.category);

  return (
    <Link
      href={`/news/${post.slug}`}
      className="mb-7 grid grid-cols-1 overflow-hidden rounded-2xl border border-accent-2/30 bg-surface-2 md:grid-cols-[1.1fr_1fr]"
    >
      <div
        className="relative min-h-60"
        style={newsCoverStyle(post.cover, `linear-gradient(135deg, ${color}, var(--color-accent-2))`)}
      >
        <span className="absolute top-4 left-4 rounded-md bg-white/90 px-2.5 py-1 font-mono text-[10px] font-bold text-bg">
          📌 Featured
        </span>
      </div>
      <div className="flex flex-col justify-center p-8">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <span
            style={{ color, borderColor: `${color}60`, background: `${color}24` }}
            className="rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold"
          >
            {post.category}
          </span>
          <span className="font-mono text-[11px] text-text-dim">
            {formatDate(post.publishedAt)}
            {post.readTimeMinutes ? ` · ${post.readTimeMinutes} min read` : ""}
          </span>
        </div>
        <h2 className="mb-3 text-[26px] leading-tight font-bold tracking-tight text-text">{post.title}</h2>
        <p className="text-[15px] leading-relaxed text-text-muted">{post.excerpt}</p>
      </div>
    </Link>
  );
}
