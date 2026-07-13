"use client";

import { useState } from "react";
import Link from "next/link";
import { NewThreadModal } from "./new-thread-modal";

// FR-009: an unauthenticated visitor is routed to log in instead of
// ever opening the modal (Listing detail's apply-panel.tsx precedent --
// a real <Link>, not a client-side redirect); the unverified-email
// gate itself is enforced server-side in create-thread.ts regardless.
export function NewThreadTrigger({ isLoggedIn, className }: { isLoggedIn: boolean; className: string }) {
  const [open, setOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link href="/login" className={className}>
        + New thread
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        + New thread
      </button>
      <NewThreadModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
