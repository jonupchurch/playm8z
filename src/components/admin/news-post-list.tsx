"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { newsCategoryColor } from "@/lib/validations/news";
import type { NewsPostFilter } from "@/lib/validations/admin-news";
import type { AdminNewsPost } from "@/lib/admin/get-news-posts";

export function statusBadgeClass(status: string): string {
  if (status === "published") return "text-[#8fe0a3] bg-[rgba(78,201,106,0.12)] border-[rgba(78,201,106,0.4)]";
  if (status === "scheduled") return "text-[#8fbfe0] bg-[rgba(53,208,224,0.1)] border-[rgba(53,208,224,0.35)]";
  return "text-text-muted bg-[rgba(180,156,106,0.12)] border-[rgba(180,156,106,0.32)]";
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPostDate(status: string, publishedAt: Date): string {
  if (status === "draft") return "—";
  return publishedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const FILTERS: { key: NewsPostFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
];

// FR-002/FR-003: the filterable post list -- cover thumb (with a pin
// badge when featured), title, status badge, date. Filtering happens
// entirely client-side (research.md #6, this feature's own list is
// small/bounded); selection lives in the URL's `postId` param
// (preserving `filter`), matching every other admin drawer/editor's
// URL-driven-selection convention.
export function NewsPostList({ posts }: { posts: AdminNewsPost[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFilter = (searchParams.get("filter") as NewsPostFilter | null) ?? "all";
  const selectedPostId = searchParams.get("postId");

  function setFilter(filter: NewsPostFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "all") params.delete("filter");
    else params.set("filter", filter);
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  function selectPost(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("postId", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  function newPost() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("postId");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  const filtered = posts.filter((post) => currentFilter === "all" || post.status === currentFilter);

  return (
    <div className="flex flex-col border-r border-border bg-surface">
      <div className="flex-none p-5 pb-3.5">
        <div className="mb-3.5 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text">News feed</h1>
          <button
            type="button"
            onClick={newPost}
            className="flex items-center gap-1.5 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3 py-1.5 font-mono text-xs font-bold text-on-accent"
          >
            <span className="text-sm leading-none">＋</span> New
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setFilter(filter.key)}
              className={
                currentFilter === filter.key
                  ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                  : "rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] font-bold text-text"
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-text-dim">No posts in this filter.</p>
        ) : (
          filtered.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => selectPost(post.id)}
              className={
                "mb-0.5 flex w-full items-center gap-3 rounded-xl border p-2.5 text-left " +
                (selectedPostId === post.id ? "border-accent bg-surface-2" : "border-transparent hover:bg-surface-2")
              }
            >
              <div
                className="relative h-11 w-11 shrink-0 rounded-[11px]"
                style={{ background: post.cover ?? `linear-gradient(135deg, ${newsCategoryColor(post.category)}, var(--color-accent-2))` }}
              >
                {post.featured && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-[#ffb000] text-[8px]">
                    📌
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 truncate text-[13.5px] font-semibold text-text">{post.title || "(untitled)"}</div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${statusBadgeClass(post.status)}`}>
                    {statusLabel(post.status)}
                  </span>
                  <span className="font-mono text-[10px] text-text-dim">{formatPostDate(post.status, post.publishedAt)}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
