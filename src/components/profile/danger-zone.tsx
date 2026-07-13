"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deactivateAccount } from "@/lib/actions/deactivate-account";

// FR-013/FR-014: a single Deactivate action -- no "Delete permanently"
// exists (ADR 0005 makes true deletion impossible platform-wide, and
// offering something labeled "permanent" would be misleading). A
// confirmation step given its impact (hiding the account), even though
// it's reversible (Principle III).
export function DangerZone() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const result = await deactivateAccount();
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push("/");
  }

  return (
    <section className="rounded-2xl border border-pop/30 bg-pop/5 p-6">
      <h2 className="mb-1.5 text-lg font-bold text-pop-text">Danger zone</h2>
      <p className="mb-4 text-[13px] text-text-muted">
        Deactivating hides your profile and postings. You can reactivate anytime by logging in.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-pop/50 px-4.5 py-2.5 text-sm font-bold text-pop-text"
        >
          Deactivate account
        </button>
      ) : (
        <div role="alertdialog" aria-label="Confirm deactivation" className="rounded-xl border border-pop/40 bg-surface p-4">
          <p className="mb-3 text-sm text-text">
            Are you sure? Your profile and postings will be hidden from other visitors until you log
            back in.
          </p>
          {error && (
            <p role="alert" className="mb-3 text-sm text-pop-text">
              {error}
            </p>
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-lg bg-pop px-4.5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
            >
              {submitting ? "Deactivating…" : "Yes, deactivate"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-border px-4.5 py-2.5 text-sm font-bold text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
