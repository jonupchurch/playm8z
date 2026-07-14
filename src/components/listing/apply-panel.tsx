"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { applyToPosting } from "@/lib/actions/apply-to-posting";
import { withdrawApplication } from "@/lib/actions/withdraw-application";
import { toggleSavedListing } from "@/lib/actions/toggle-saved-listing";
import { ReportModal, type ReportTarget } from "@/components/reports/report-modal";

export type ViewerState = "host" | "accepted" | "pending" | "full" | "not-applied";

export function ApplyPanel({
  postingId,
  hostId,
  hostHandle,
  title,
  viewerState,
  applicationId,
  seatsOpen,
  seatsTotal,
  isLoggedIn,
  initialSaved,
}: {
  postingId: string;
  hostId: string;
  hostHandle: string;
  title: string;
  viewerState: ViewerState;
  applicationId?: string;
  seatsOpen: number;
  seatsTotal: number;
  isLoggedIn: boolean;
  initialSaved: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);
  const [shareCopied, setShareCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // FR-010 (006-listing-detail's amended, previously-deferred Report
  // action): targets the posting itself, but "Also block" blocks the
  // *host* -- decoupled on purpose (report-modal.tsx's ReportTarget).
  const reportTarget: ReportTarget = {
    targetType: "posting",
    targetId: postingId,
    label: `Posting by @${hostHandle} — "${title}"`,
    blockUserId: hostId,
  };

  async function handleApply(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await applyToPosting(postingId, { message: message || undefined });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleWithdraw() {
    if (!applicationId) return;
    setSubmitting(true);
    setError(null);
    const result = await withdrawApplication(applicationId);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleToggleSave() {
    const result = await toggleSavedListing(postingId);
    if (result.success) {
      setSaved(result.saved);
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) --
      // the URL is still visible in the address bar, so this is a
      // non-critical convenience action.
    }
  }

  const pips = Array.from({ length: seatsTotal }, (_, index) => index < seatsTotal - seatsOpen);

  return (
    <div className="rounded-2xl border border-accent-2/30 bg-surface p-5.5 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.9)]">
      <div className="mb-3 flex items-baseline justify-between">
        <span aria-live="polite" className="text-xl font-bold text-text">
          {seatsOpen} spot{seatsOpen === 1 ? "" : "s"} open
        </span>
        <span className="font-mono text-[11px] text-text-muted">of {seatsTotal}</span>
      </div>
      <div aria-hidden="true" className="mb-4.5 flex gap-1.5">
        {pips.map((filled, index) => (
          <span
            key={index}
            className={
              filled
                ? "h-2 flex-1 rounded-full bg-border"
                : "h-2 flex-1 rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))]"
            }
          />
        ))}
      </div>

      <div aria-live="polite">
        {viewerState === "host" && (
          <p className="text-sm text-text-muted">This is your own listing.</p>
        )}

        {viewerState === "accepted" && (
          <div className="py-1 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-success/50 bg-success/15">
              <span className="text-xl font-bold text-success">✓</span>
            </div>
            <div className="mb-1.5 text-[17px] font-bold text-text">You&apos;re in!</div>
            <p className="text-[13px] leading-relaxed text-text-muted">
              @{hostHandle} accepted your application.
            </p>
          </div>
        )}

        {viewerState === "pending" && (
          <div className="py-1 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-success/50 bg-success/15">
              <span className="text-xl font-bold text-success">✓</span>
            </div>
            <div className="mb-1.5 text-[17px] font-bold text-text">Application sent!</div>
            <p className="mb-4 text-[13px] leading-relaxed text-text-muted">
              @{hostHandle} will review your request and message you if it&apos;s a fit.
            </p>
            {error && (
              <p role="alert" className="mb-3 text-sm text-pop-text">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={submitting}
              className="w-full rounded-xl border border-border bg-surface-2 py-2.5 text-sm font-bold text-text disabled:opacity-60"
            >
              {submitting ? "Withdrawing…" : "Withdraw application"}
            </button>
          </div>
        )}

        {viewerState === "full" && (
          <p className="text-sm text-text-muted">This listing has no open spots right now.</p>
        )}

        {viewerState === "not-applied" && !isLoggedIn && (
          <Link
            href="/login"
            className="block w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-center text-sm font-bold text-on-accent"
          >
            Log in to apply
          </Link>
        )}

        {viewerState === "not-applied" && isLoggedIn && (
          <form onSubmit={handleApply}>
            <label htmlFor="apply-message" className="mb-2 block text-[13px] font-bold text-text">
              Message to @{hostHandle}
            </label>
            <textarea
              id="apply-message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 500))}
              maxLength={500}
              rows={4}
              placeholder="Introduce yourself — rank, role, availability…"
              className="mb-3 w-full resize-y rounded-lg border border-border bg-bg px-3.5 py-3 text-sm leading-relaxed text-text outline-none"
            />
            {error && (
              <p role="alert" className="mb-3 text-sm text-pop-text">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-sm font-bold text-on-accent disabled:opacity-60"
            >
              {submitting ? "Applying…" : "Apply for a slot"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 flex gap-2.5 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 rounded-lg border border-border py-2 text-xs font-bold text-text-muted"
        >
          {shareCopied ? "Copied!" : "Share"}
        </button>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleToggleSave}
            className="flex-1 rounded-lg border border-border py-2 text-xs font-bold text-text-muted"
          >
            {saved ? "Saved ✓" : "Save"}
          </button>
        ) : (
          <Link
            href="/login"
            className="flex-1 rounded-lg border border-border py-2 text-center text-xs font-bold text-text-muted"
          >
            Save
          </Link>
        )}
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="rounded-lg border border-pop/35 px-3 py-2 text-xs font-bold text-pop-text"
          >
            ⚑ Report
          </button>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-pop/35 px-3 py-2 text-center text-xs font-bold text-pop-text"
          >
            ⚑ Report
          </Link>
        )}
      </div>

      <ReportModal open={reportOpen} target={reportTarget} onClose={() => setReportOpen(false)} />
    </div>
  );
}
