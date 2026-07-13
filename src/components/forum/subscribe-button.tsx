"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleSubscription } from "@/lib/actions/toggle-subscription";

// FR-010/FR-011: stores a per-user preference only -- no notification
// is ever sent as a result (research.md #5). An unauthenticated
// visitor is routed to log in instead of toggling anything.
export function SubscribeButton({
  threadId,
  initialSubscribed,
  isLoggedIn,
}: {
  threadId: string;
  initialSubscribed: boolean;
  isLoggedIn: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, setPending] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-muted">
        Subscribe
      </Link>
    );
  }

  async function handleClick() {
    setPending(true);
    const result = await toggleSubscription({ threadId });
    setPending(false);
    if (result.success) {
      setSubscribed(result.subscribed);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={
        subscribed
          ? "rounded-lg border border-success/40 bg-success/10 px-3.5 py-2 text-xs font-semibold text-success disabled:opacity-60"
          : "rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-muted disabled:opacity-60"
      }
    >
      {subscribed ? "✓ Subscribed" : "Subscribe"}
    </button>
  );
}
