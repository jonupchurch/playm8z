import Link from "next/link";
import { newsCategoryColor } from "@/lib/validations/news";
import type { RelatedArticle } from "@/lib/news/get-news-article";

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// FR-007: up to 3 other currently-live articles, excluding the
// current one -- fewer than 3 (including zero, in which case this
// section simply isn't rendered by the caller) is a normal result,
// never padded with placeholder cards.
export function ArticleRelated({ posts }: { posts: RelatedArticle[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-250 px-8 py-11">
        <div className="mb-4.5 font-mono text-[11px] tracking-[0.16em] text-pop-text uppercase">Keep reading</div>
        <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
          {posts.map((post) => {
            const color = newsCategoryColor(post.category);
            return (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                className="overflow-hidden rounded-2xl border border-border bg-surface-2"
              >
                <div
                  className="h-27.5"
                  style={{ background: post.cover ?? `linear-gradient(135deg, ${color}, var(--color-accent-2))` }}
                />
                <div className="p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      style={{ color, borderColor: `${color}60`, background: `${color}24` }}
                      className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold"
                    >
                      {post.category}
                    </span>
                    <span className="font-mono text-[10px] text-text-dim">{formatDate(post.publishedAt)}</span>
                  </div>
                  <h3 className="mb-1.5 text-[15px] leading-tight font-bold text-text">{post.title}</h3>
                  <p className="text-[12.5px] leading-relaxed text-text-muted">{post.excerpt}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
