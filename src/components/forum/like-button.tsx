"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleLike } from "@/lib/actions/toggle-like";

// FR-008/FR-011: like/unlike exactly once; an unauthenticated visitor
// is routed to log in instead of ever attempting the toggle. The
// glyph-only "▲" needs a real accessible name (plan.md's WCAG
// constraint) -- provided via aria-label plus aria-pressed reflecting
// the current state.
export function LikeButton({
  targetType,
  targetId,
  initialLikes,
  initialLiked,
  isLoggedIn,
}: {
  targetType: "thread" | "reply";
  targetId: string;
  initialLikes: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}) {
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        aria-label="Log in to like"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs font-bold text-text-muted"
      >
        <span aria-hidden className="text-xs">
          ▲
        </span>
        {likeCount}
      </Link>
    );
  }

  async function handleClick() {
    setPending(true);
    const result = await toggleLike({ targetType, targetId });
    setPending(false);
    if (result.success) {
      setLiked(result.liked);
      setLikeCount((count) => count + (result.liked ? 1 : -1));
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={
        liked
          ? "flex items-center gap-1.5 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3 py-1.5 font-mono text-xs font-bold text-on-accent disabled:opacity-60"
          : "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs font-bold text-text-muted disabled:opacity-60"
      }
    >
      <span aria-hidden className="text-xs">
        ▲
      </span>
      {likeCount}
    </button>
  );
}
