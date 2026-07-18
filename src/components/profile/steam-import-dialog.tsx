"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { importSteamGames, readSteamLibrary, type ReviewResult } from "@/lib/actions/steam-import";
import type { ReviewItem } from "@/lib/steam/merge-library";

const MESSAGES: Record<string, string> = {
  private: "We couldn't see your library — set your Steam game details to Public, or add games by hand below.",
  empty: "No games found on your Steam account.",
  "not-connected": "Connect Steam first.",
  "steam-unavailable": "Steam isn't responding right now — please try again in a bit.",
};

// FR-004/FR-007: the review-and-select import. Reads the library on mount,
// pre-selects recently-played games not already on the profile, and lets the
// player confirm which to add. Every non-list state (private/empty/unavailable)
// is a plain message, never an error screen.
export function SteamImportDialog({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<ReviewResult | { kind: "loading" }>({ kind: "loading" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readSteamLibrary().then((result) => {
      if (!active) return;
      setState(result);
      if (result.kind === "list") {
        const pre = new Set<number>();
        result.items.forEach((item, i) => {
          if (item.recentlyPlayed && !item.alreadyOnProfile) pre.add(i);
        });
        setSelected(pre);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function toggle(i: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleImport(items: ReviewItem[]) {
    setSubmitting(true);
    setError(null);
    const payload = [...selected].map((i) => ({ name: items[i].name, hoursPlayed: items[i].hoursPlayed }));
    const result = await importSteamGames(payload);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAdded(result.added);
    router.refresh();
    onDone?.();
  }

  if (state.kind === "loading") {
    return <p className="mt-3 text-sm text-text-muted">Reading your Steam library…</p>;
  }
  if (state.kind !== "list") {
    return (
      <p className="mt-3 text-sm text-text-muted" role={state.kind === "steam-unavailable" ? "alert" : undefined}>
        {MESSAGES[state.kind]}
      </p>
    );
  }
  if (added !== null) {
    return (
      <p className="mt-3 text-sm text-[#8fe0a3]" role="status">
        Added {added} game{added === 1 ? "" : "s"} to your profile.
      </p>
    );
  }

  const items = state.items;
  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-[13px] text-text-dim">
        Recently-played games are pre-selected. Choose which to add — your existing games are left as they are.
      </p>
      <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto rounded-xl border border-border bg-surface p-2">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`}>
            <label
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                item.alreadyOnProfile ? "opacity-55" : "cursor-pointer hover:bg-surface-2"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent-2"
                checked={item.alreadyOnProfile || selected.has(i)}
                disabled={item.alreadyOnProfile}
                onChange={() => toggle(i)}
              />
              <span className="min-w-0 flex-1 truncate text-text">{item.name}</span>
              {item.recentlyPlayed && !item.alreadyOnProfile && (
                <span className="shrink-0 font-mono text-[10px] text-accent-2">recent</span>
              )}
              <span className="shrink-0 font-mono text-[10px] text-text-dim">
                {item.alreadyOnProfile ? "already added" : `${item.hoursPlayed}h`}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-xs text-pop-text">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => handleImport(items)}
        disabled={submitting || selected.size === 0}
        className="self-start rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-60"
      >
        {submitting ? "Adding…" : `Add ${selected.size} game${selected.size === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
