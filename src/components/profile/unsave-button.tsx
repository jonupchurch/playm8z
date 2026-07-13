"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleSavedListing } from "@/lib/actions/toggle-saved-listing";

// Reuses Listing detail's (006) toggle-saved-listing.ts directly --
// unsaving from either surface removes the same savedListings row.
export function UnsaveButton({ postingId }: { postingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleUnsave() {
    setPending(true);
    await toggleSavedListing(postingId);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleUnsave}
      disabled={pending}
      aria-label="Unsave this listing"
      className="shrink-0 text-lg text-pop disabled:opacity-60"
    >
      ♥
    </button>
  );
}
