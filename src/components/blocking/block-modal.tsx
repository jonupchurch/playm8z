"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { blockUser } from "@/lib/actions/block-user";
import { searchBlockCandidates } from "@/lib/actions/search-block-candidates";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import type { UserCandidate } from "@/lib/users/search-users";

function avatarGradient(color: string | null) {
  return AVATAR_COLORS.find((swatch) => swatch.id === color)?.gradient ?? AVATAR_COLORS[0].gradient;
}

// FR-005: reusable, two-step (pick candidate -> confirm) dialog. When
// a target is pre-selected (a future caller invoking this directly
// from e.g. a profile page), the pick step is skipped entirely.
export function BlockModal({
  open,
  preSelected,
  onClose,
}: {
  open: boolean;
  preSelected?: UserCandidate;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"pick" | "confirm">(preSelected ? "confirm" : "pick");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<UserCandidate[]>([]);
  const [selected, setSelected] = useState<UserCandidate | null>(preSelected ?? null);
  const [alsoReport, setAlsoReport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Resets fresh each time the dialog transitions to open -- adjusting
  // state during render (React's documented escape hatch) rather than
  // in an Effect, which avoids the extra cascading render an
  // Effect-based reset would otherwise trigger.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(preSelected ? "confirm" : "pick");
      setSelected(preSelected ?? null);
      setQuery("");
      setCandidates([]);
      setAlsoReport(false);
      setError(null);
    }
  }

  useEffect(() => {
    if (step !== "pick") return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      void searchBlockCandidates(query).then((results) => {
        if (!cancelled) setCandidates(results);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, step]);

  function handleDialogClose() {
    onClose();
  }

  function handlePick(candidate: UserCandidate) {
    setSelected(candidate);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    const result = await blockUser({ blockedId: selected.id, alsoReport });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="block-modal-heading"
      onClose={handleDialogClose}
      className="hidden max-h-[84vh] w-110 max-w-[92vw] flex-col rounded-2xl border border-border bg-surface-2 p-0 text-text open:flex backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
        <h2 id="block-modal-heading" className="text-base font-bold text-text">
          {step === "confirm" ? "Confirm block" : "Block a user"}
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

      {step === "pick" && (
        <>
          <div className="shrink-0 p-5 pb-2">
            <label htmlFor="block-search" className="sr-only">
              Search players to block
            </label>
            <input
              id="block-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search players to block…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </div>
          <div className="min-h-35 flex-1 overflow-y-auto px-3 pb-2">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => handlePick(candidate)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface"
              >
                <div
                  style={{ background: avatarGradient(candidate.avatarColor) }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-sm font-bold text-on-accent"
                >
                  {candidate.handle.trim()[0]?.toUpperCase() || "P"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text">@{candidate.handle}</div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-pop-text">Block</span>
              </button>
            ))}
            {candidates.length === 0 && (
              <div className="py-7 text-center text-sm text-text-dim">No players found.</div>
            )}
          </div>
        </>
      )}

      {step === "confirm" && selected && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
            <div
              style={{ background: avatarGradient(selected.avatarColor) }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold text-on-accent"
            >
              {selected.handle.trim()[0]?.toUpperCase() || "P"}
            </div>
            <div className="text-sm font-bold text-text">@{selected.handle}</div>
          </div>
          <p className="mb-3.5 text-sm leading-relaxed text-text-muted">
            Block <b className="text-text">@{selected.handle}</b>? They won&apos;t be able to message you, apply to
            your parties, or see your content — and you won&apos;t see theirs.
          </p>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={alsoReport}
              onChange={() => setAlsoReport((value) => !value)}
              className="h-5 w-5 rounded-md border-border"
            />
            <span className="text-sm text-text-muted">Also report this user to moderators</span>
          </label>
          {error && (
            <p role="alert" className="mt-3 text-sm text-pop-text">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="flex shrink-0 gap-2.5 border-t border-border p-5">
        {step === "confirm" ? (
          <>
            <button
              type="button"
              onClick={() => setStep("pick")}
              className="rounded-lg border border-border bg-surface px-5 py-3 text-sm font-bold text-text-dim"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 rounded-lg bg-pop px-4 py-3 text-sm font-bold text-on-accent disabled:opacity-60"
            >
              {submitting ? "Blocking…" : alsoReport ? "Block & report" : "Block user"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-bold text-text"
          >
            Cancel
          </button>
        )}
      </div>
    </dialog>
  );
}
