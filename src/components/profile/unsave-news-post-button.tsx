"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleSavedNewsPost } from "@/lib/actions/toggle-saved-news-post";

// News Article detail (023) -- reuses toggle-saved-news-post.ts
// directly, the same "unsave from either surface removes the same
// row" precedent as unsave-button.tsx's own (savedListings/006).
export function UnsaveNewsPostButton({ newsPostId }: { newsPostId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleUnsave() {
    setPending(true);
    await toggleSavedNewsPost({ newsPostId });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleUnsave}
      disabled={pending}
      aria-label="Unsave this article"
      className="shrink-0 text-lg text-pop disabled:opacity-60"
    >
      ♥
    </button>
  );
}
