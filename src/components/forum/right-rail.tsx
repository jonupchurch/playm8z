"use client";

import { useForumUrlParams } from "@/lib/hooks/use-forum-url-params";

function formatCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// FR-006/SC-005: real member/thread counts, recalculated per request.
// "Online" is deliberately absent (spec's Edge Cases -- no presence
// system exists) and there's no Discord widget (already-decided future
// state, not depicted here as working).
export function RightRail({
  memberCount,
  threadCount,
  trendingTags,
}: {
  memberCount: number;
  threadCount: number;
  trendingTags: string[];
}) {
  const { setQuery, setCategory } = useForumUrlParams();

  function selectTag(tag: string) {
    setCategory("all");
    setQuery(tag);
  }

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
        <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Community</div>
        <div className="flex justify-between">
          <div>
            <div className="text-[19px] font-bold text-text">{formatCount(memberCount)}</div>
            <div className="font-mono text-[10px] text-text-dim">members</div>
          </div>
          <div>
            <div className="text-[19px] font-bold text-text">{formatCount(threadCount)}</div>
            <div className="font-mono text-[10px] text-text-dim">threads</div>
          </div>
        </div>
      </div>

      {trendingTags.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
          <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Trending tags</div>
          <div className="flex flex-wrap gap-1.5">
            {trendingTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => selectTag(tag)}
                className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-text-muted"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
