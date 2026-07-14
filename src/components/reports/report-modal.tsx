"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitReport } from "@/lib/actions/submit-report";
import { reportReasonEnum, type ReportTargetType } from "@/lib/validations/notifications";

const REASONS: { value: (typeof reportReasonEnum.options)[number]; label: string; desc: string }[] = [
  { value: "spam", label: "Spam or scam", desc: "Phishing, ads, boosting, fake giveaways" },
  { value: "harassment", label: "Harassment or hate", desc: "Bullying, slurs, targeted abuse" },
  { value: "inappropriate", label: "Inappropriate content", desc: "Explicit or offensive material" },
  { value: "underage", label: "Underage or safety", desc: "Minor safety concern" },
  { value: "impersonation", label: "Impersonation", desc: "Pretending to be someone else or staff" },
  { value: "other", label: "Something else", desc: "Anything not covered above" },
];

export type ReportTarget = {
  targetType: ReportTargetType;
  targetId: string;
  label: string;
  /** Who "Also block" would block -- may differ from targetId (e.g. reporting
   * a posting blocks its host, not the posting "itself"). Omit if unknown;
   * the block option simply won't be offered. */
  blockUserId?: string;
};

// FR-006/FR-007/FR-008: the reusable, canonical 3-step report flow
// (reason -> optional details + "also block" -> done), following the
// established dialog pattern (Blocked Users' block-modal.tsx, Inbox's
// compose-modal.tsx) -- `hidden ... open:flex` rather than a bare
// `flex` class, since Tailwind v4's layered utilities otherwise beat
// the browser's `dialog:not([open])` UA rule and the dialog never
// visually hides once closed.
export function ReportModal({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState<(typeof reportReasonEnum.options)[number] | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Resets on every open/close transition (compose-modal.tsx's pattern)
  // -- a native <dialog> keeps its subtree mounted while closed, so a
  // reset only on *opening* would leave a stale step/reason visible for
  // an instant the next time it opens against a different target.
  if (open !== wasOpen) {
    setWasOpen(open);
    setStep(1);
    setReason(null);
    setDetails("");
    setAlsoBlock(false);
    setError(null);
    setBlocked(false);
  }

  function handleDialogClose() {
    onClose();
  }

  async function handleSubmit() {
    if (!target || !reason) return;
    setSubmitting(true);
    setError(null);
    const result = await submitReport({
      targetType: target.targetType,
      targetId: target.targetId,
      reason,
      details: details.trim() || undefined,
      alsoBlock,
      blockUserId: target.blockUserId,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setBlocked(result.alsoBlocked);
    setStep(3);
  }

  function handleClose() {
    dialogRef.current?.close();
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="report-modal-heading"
      onClose={handleDialogClose}
      className="hidden max-h-[86vh] w-115 max-w-[92vw] flex-col rounded-2xl border border-border bg-surface-2 p-0 text-text open:flex backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
        <h2 id="report-modal-heading" className="text-base font-bold text-text">
          {step === 3 ? "Thanks for the report" : "Report"}
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-dim"
        >
          ✕
        </button>
      </div>

      {target && step !== 3 && (
        <div className="shrink-0 px-5 pt-3.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5">
            <span
              aria-hidden="true"
              className="h-5.5 w-5.5 shrink-0 rounded-md bg-[linear-gradient(135deg,var(--color-pop),var(--color-accent-2))]"
            />
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-text-dim">Reporting</div>
              <div className="truncate text-[13px] font-semibold text-text">{target.label}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        {step === 1 && (
          <>
            <div className="mb-3 text-sm font-semibold text-text">Why are you reporting this?</div>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Report reason">
              {REASONS.map((option) => {
                const isSelected = reason === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setReason(option.value)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left ${
                      isSelected ? "border-accent-2 bg-accent-2/10" : "border-border bg-surface"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-4.5 w-4.5 shrink-0 rounded-full border-2 ${
                        isSelected
                          ? "border-accent-2 bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))]"
                          : "border-border"
                      }`}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-text">{option.label}</span>
                      <span className="block text-xs text-text-muted">{option.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <span className="mb-3.5 inline-block rounded-full border border-accent-2/35 bg-accent-2/10 px-2.5 py-1 font-mono text-[11px] font-bold text-accent-text">
              {REASONS.find((option) => option.value === reason)?.label}
            </span>
            <label htmlFor="report-details" className="mb-2 block text-[13px] font-semibold text-text">
              Add details <span className="font-normal text-text-dim">(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value.slice(0, 1000))}
              maxLength={1000}
              rows={4}
              placeholder="What happened? Anything moderators should know…"
              className="mb-3.5 w-full resize-y rounded-xl border border-border bg-bg px-3.5 py-3 text-sm leading-relaxed text-text outline-none"
            />
            {target?.blockUserId && (
              <button
                type="button"
                onClick={() => setAlsoBlock((value) => !value)}
                className="flex items-center gap-2.5 bg-transparent p-0"
              >
                <span
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 rounded-md border ${
                    alsoBlock
                      ? "border-accent-2 bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))]"
                      : "border-border"
                  }`}
                />
                <span className="text-[13px] text-text-muted">Also block this user</span>
              </button>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-pop-text">
                {error}
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <div className="py-1.5 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-success/50 bg-success/15">
              <span className="text-2xl font-bold text-success">✓</span>
            </div>
            <div className="mb-2 text-lg font-bold text-text">Report submitted</div>
            <p className="text-sm leading-relaxed text-text-muted">
              Thanks for keeping playm8z safe. Our moderators review reports within 24 hours
              {blocked ? ", and we've blocked this user for you" : ""}.
            </p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-2.5 border-t border-border p-5">
        {step === 1 && (
          <button
            type="button"
            onClick={() => reason && setStep(2)}
            disabled={!reason}
            className="w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-sm font-bold text-on-accent disabled:opacity-50"
          >
            Continue
          </button>
        )}
        {step === 2 && (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-bold text-text-muted"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-pop py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </>
        )}
        {step === 3 && (
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-sm font-bold text-on-accent"
          >
            Done
          </button>
        )}
      </div>
    </dialog>
  );
}
