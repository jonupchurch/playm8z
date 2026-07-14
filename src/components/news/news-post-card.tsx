import { newsCategoryColor } from "@/lib/validations/news";
import type { NewsPostRow } from "@/lib/news/search-news";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NewsPostCard({ post }: { post: NewsPostRow }) {
  const color = newsCategoryColor(post.category);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-2">
      <div
        className="relative h-32.5"
        style={{ background: post.cover ?? `linear-gradient(135deg, ${color}, var(--color-accent-2))` }}
      >
        {post.upcoming && (
          <span className="absolute top-3 left-3 rounded-md bg-info px-2.5 py-1 font-mono text-[10px] font-bold text-bg">
            Upcoming
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            style={{ color, borderColor: `${color}60`, background: `${color}24` }}
            className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold"
          >
            {post.category}
          </span>
          <span className="font-mono text-[10px] text-text-dim">{formatDate(post.publishedAt)}</span>
        </div>
        <h3 className="mb-2 text-base leading-tight font-bold text-text">{post.title}</h3>
        <p className="flex-1 text-[13px] leading-relaxed text-text-muted">{post.excerpt}</p>
        {post.readTimeMinutes && (
          <div className="mt-3.5 border-t border-border pt-3 font-mono text-[10px] text-text-dim">
            {post.readTimeMinutes} min read
          </div>
        )}
      </div>
    </div>
  );
}
