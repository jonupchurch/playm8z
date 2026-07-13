"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { unblockUser } from "@/lib/actions/unblock-user";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";

export type UnblockTarget = {
  blockId: string;
  handle: string;
  avatarColor: string | null;
};

// This project's first modal-dialog UI (research.md #2) -- built on
// the native <dialog> element rather than a hand-rolled overlay:
// showModal()/close() give a real focus trap, Escape-to-close, and
// automatic focus restoration to the triggering control for free,
// with an implicit "dialog" role that needs no extra ARIA plumbing.
export function UnblockModal({
  target,
  onClose,
}: {
  target: UnblockTarget | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (target && !dialog.open) {
      dialog.showModal();
    } else if (!target && dialog.open) {
      dialog.close();
    }
  }, [target]);

  function handleClose() {
    setError(null);
    setSubmitting(false);
    onClose();
  }

  async function handleConfirm() {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    const result = await unblockUser(target.blockId);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  const avatarGradient =
    AVATAR_COLORS.find((swatch) => swatch.id === target?.avatarColor)?.gradient ?? AVATAR_COLORS[0].gradient;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="unblock-modal-heading"
      onClose={handleClose}
      className="w-100 max-w-[92vw] rounded-2xl border border-border bg-surface-2 p-0 text-text backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      {target && (
        <>
          <div className="p-5.5 pb-2">
            <div className="mb-4 flex items-center gap-3">
              <div
                style={{ background: avatarGradient }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold text-on-accent"
              >
                {(target.handle.trim()[0] || "P").toUpperCase()}
              </div>
              <div>
                <h2 id="unblock-modal-heading" className="text-base font-bold text-text">
                  Unblock @{target.handle}?
                </h2>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-text-muted">
              They&apos;ll be able to message you, apply to your parties, and see your content again.
              You can re-block them anytime.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-pop-text">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2.5 border-t border-border p-5.5 pt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-bold text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-3 text-sm font-bold text-on-accent disabled:opacity-60"
            >
              {submitting ? "Unblocking…" : "Unblock"}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
