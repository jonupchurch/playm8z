"use client";

import Link from "next/link";
import { useBrowseUrlParams } from "@/lib/hooks/use-browse-url-params";

// FR-017: guidance copy, a "Clear filters" action (US2's Clear all
// behavior), and a "Post a game" action toward the future Post a Game
// route.
export function BrowseEmptyState() {
  const { searchParams, clearAll } = useBrowseUrlParams();
  const q = searchParams.get("q")?.trim();
  const postHref = q ? `/post?game=${encodeURIComponent(q)}` : "/post";

  return (
    <div className="rounded-2xl border border-dashed border-border py-18 text-center">
      <div className="mb-2 text-lg font-bold text-text">No parties match those filters.</div>
      <p className="mb-4.5 text-sm text-text-muted">
        Loosen a filter, or post the game yourself and let players come to you.
      </p>
      <div className="flex justify-center gap-2.5">
        <button
          type="button"
          onClick={clearAll}
          className="rounded-xl border border-border bg-surface-2 px-5 py-2.5 text-sm font-semibold text-text"
        >
          Clear filters
        </button>
        <Link
          href={postHref}
          className="rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5.5 py-2.5 text-sm font-bold text-on-accent"
        >
          Post a game
        </Link>
      </div>
    </div>
  );
}
