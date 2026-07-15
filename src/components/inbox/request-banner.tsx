"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptRequest } from "@/lib/actions/accept-request";
import { declineRequest } from "@/lib/actions/decline-request";

// FR-007/FR-008: Accept atomically decrements the posting's open-slot
// count and creates a real Conversation -- the client then navigates
// to that new conversation, since none existed at this id before.
// Decline just marks the Application declined; the request then drops
// out of the merged list entirely (get-inbox-list.ts only surfaces
// `pending` Applications), so the client returns to the empty state.
export function RequestBanner({
  applicationId,
  applicantHandle,
  hostHandle,
  initiatedBy,
  context,
}: {
  applicationId: string;
  applicantHandle: string;
  hostHandle: string;
  initiatedBy: "applicant" | "host";
  context: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setSubmitting("accept");
    setError(null);
    const result = await acceptRequest({ applicationId });
    setSubmitting(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/inbox/${result.conversationId}`);
  }

  async function handleDecline() {
    setSubmitting("decline");
    setError(null);
    const result = await declineRequest({ applicationId });
    setSubmitting(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push("/inbox");
  }

  return (
    <div className="m-4.5 mb-0 flex flex-wrap items-center gap-3.5 rounded-2xl border border-accent/35 bg-accent/10 p-4">
      <div className="flex-1">
        <div className="text-sm font-bold text-text">
          {initiatedBy === "host" ? `@${hostHandle} invited you to their party` : `@${applicantHandle} wants to join your party`}
        </div>
        <div className="font-mono text-[11px] text-text-muted">{context}</div>
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-pop-text">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDecline}
        disabled={submitting !== null}
        className="rounded-lg border border-pop/40 px-4 py-2.5 text-sm font-semibold text-pop-text disabled:opacity-60"
      >
        {submitting === "decline" ? "Declining…" : "Decline"}
      </button>
      <button
        type="button"
        onClick={handleAccept}
        disabled={submitting !== null}
        className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4.5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
      >
        {submitting === "accept" ? "Accepting…" : "Accept"}
      </button>
    </div>
  );
}
