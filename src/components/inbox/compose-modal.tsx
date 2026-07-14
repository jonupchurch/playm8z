"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/lib/actions/start-conversation";
import { searchContacts } from "@/lib/inbox/search-contacts";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import type { ContactCandidate } from "@/lib/inbox/search-contacts";

function avatarGradient(color: string | null) {
  return AVATAR_COLORS.find((swatch) => swatch.id === color)?.gradient ?? AVATAR_COLORS[0].gradient;
}

// research.md #4/FR-005/FR-006: follows Blocked Users' block-modal.tsx
// dialog-accessibility pattern (focus trap, native showModal()/close(),
// Escape-to-close, focus restoration, debounced search). A single
// selected contact starts/reuses a direct conversation; two or more
// starts a group, with an optional name.
export function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ContactCandidate[]>([]);
  const [selected, setSelected] = useState<ContactCandidate[]>([]);
  const [groupName, setGroupName] = useState("");
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

  // Resets on EVERY open/close transition, not just opening -- closing
  // without clearing `candidates` would leave stale (merely hidden,
  // still-mounted) candidate rows in the DOM, which a native <dialog>
  // keeps rendered even while visually hidden.
  if (open !== wasOpen) {
    setWasOpen(open);
    setQuery("");
    setCandidates([]);
    setSelected([]);
    setGroupName("");
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      void searchContacts(query).then((results) => {
        if (!cancelled) setCandidates(results);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, open]);

  function handleDialogClose() {
    onClose();
  }

  function toggleContact(candidate: ContactCandidate) {
    setSelected((current) =>
      current.some((c) => c.id === candidate.id)
        ? current.filter((c) => c.id !== candidate.id)
        : [...current, candidate],
    );
  }

  async function handleStart() {
    if (selected.length === 0) return;
    setSubmitting(true);
    setError(null);
    const result = await startConversation({
      recipientIds: selected.map((c) => c.id),
      groupName: selected.length > 1 ? groupName : undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onClose();
    router.push(`/inbox/${result.conversationId}`);
  }

  const isGroup = selected.length > 1;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="compose-modal-heading"
      onClose={handleDialogClose}
      className="hidden max-h-[84vh] w-115 max-w-[92vw] rounded-2xl border border-border bg-surface-2 p-0 text-text open:flex open:flex-col backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
        <h2 id="compose-modal-heading" className="text-base font-bold text-text">
          New message
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

      <div className="shrink-0 p-5 pb-2">
        <label htmlFor="compose-search" className="sr-only">
          Search players
        </label>
        <input
          id="compose-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players…"
          className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-dim"
        />

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selected.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => toggleContact(candidate)}
                className="flex items-center gap-1.5 rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-1 pr-2.5 pl-3 text-xs font-bold text-on-accent"
              >
                @{candidate.handle} <span aria-hidden="true">×</span>
                <span className="sr-only">Remove @{candidate.handle}</span>
              </button>
            ))}
          </div>
        )}

        {isGroup && (
          <label htmlFor="compose-group-name" className="block">
            <span className="sr-only">Group name (optional)</span>
            <input
              id="compose-group-name"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name (optional)"
              maxLength={60}
              className="mb-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </label>
        )}
      </div>

      <div className="min-h-30 flex-1 overflow-y-auto px-3 pb-2">
        {candidates.map((candidate) => {
          const isSelected = selected.some((c) => c.id === candidate.id);
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => toggleContact(candidate)}
              aria-pressed={isSelected}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface"
            >
              <span
                aria-hidden="true"
                className={`h-5 w-5 shrink-0 rounded-md border ${
                  isSelected
                    ? "border-accent bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))]"
                    : "border-border"
                }`}
              />
              <div
                style={{ background: avatarGradient(candidate.avatarColor) }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-sm font-bold text-on-accent"
              >
                {candidate.handle.trim()[0]?.toUpperCase() || "P"}
              </div>
              <div className="min-w-0 flex-1 truncate text-sm font-semibold text-text">@{candidate.handle}</div>
            </button>
          );
        })}
        {candidates.length === 0 && (
          <div className="py-7 text-center text-sm text-text-dim">No players found.</div>
        )}
      </div>

      {error && (
        <p role="alert" className="px-5 text-sm text-pop-text">
          {error}
        </p>
      )}

      <div className="shrink-0 gap-2.5 border-t border-border p-5">
        <button
          type="button"
          onClick={handleStart}
          disabled={submitting || selected.length === 0}
          className="w-full rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-3 text-sm font-bold text-on-accent disabled:opacity-60"
        >
          {submitting ? "Starting…" : isGroup ? "Start group chat" : "Start chat"}
        </button>
      </div>
    </dialog>
  );
}
