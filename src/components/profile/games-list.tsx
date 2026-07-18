"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addUserGame, removeUserGame } from "@/lib/actions/manage-games";
import { GameImage } from "@/components/games/game-image";
import type { ResolvedGameImage } from "@/lib/games/resolve-game-image";

export type UserGameRow = {
  id: string;
  game: string;
  rank: string | null;
  hoursPlayed: number | null;
  image?: ResolvedGameImage;
};

// FR-003: add/remove a game (with optional self-reported rank/hours).
export function GamesList({ games }: { games: UserGameRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [game, setGame] = useState("");
  const [rank, setRank] = useState("");
  const [hours, setHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await addUserGame({
      game,
      rank: rank || undefined,
      hoursPlayed: hours ? Number(hours) : undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setGame("");
    setRank("");
    setHours("");
    setAdding(false);
    router.refresh();
  }

  async function handleRemove(id: string) {
    await removeUserGame(id);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-[10px] tracking-wider text-accent-2 uppercase">Games I play</h2>
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          className="font-mono text-xs font-bold text-accent-2"
        >
          {adding ? "Cancel" : "+ Add game"}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3.5">
          <label htmlFor="new-game-name" className="sr-only">
            Game name
          </label>
          <input
            id="new-game-name"
            value={game}
            onChange={(event) => setGame(event.target.value)}
            placeholder="Game name"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="new-game-rank" className="sr-only">
                Rank (optional)
              </label>
              <input
                id="new-game-rank"
                value={rank}
                onChange={(event) => setRank(event.target.value)}
                placeholder="Rank (optional)"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
              />
            </div>
            <div>
              <label htmlFor="new-game-hours" className="sr-only">
                Hours played (optional)
              </label>
              <input
                id="new-game-hours"
                value={hours}
                onChange={(event) => setHours(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="Hours (optional)"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-xs text-pop-text">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || game.trim().length === 0}
            className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-2 text-sm font-bold text-on-accent disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {games.length === 0 ? (
        <p className="text-sm text-text-muted">No games added yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {games.map((entry) => (
            <div key={entry.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              {entry.image && (
                <GameImage image={entry.image} name={entry.game} className="h-14 w-full text-sm" />
              )}
              <div className="p-3.5">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="text-[15px] font-bold text-text">{entry.game}</div>
                <button
                  type="button"
                  onClick={() => handleRemove(entry.id)}
                  aria-label={`Remove ${entry.game}`}
                  className="shrink-0 text-text-dim"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                {entry.rank && <span className="text-accent">{entry.rank}</span>}
                {entry.hoursPlayed != null && <span className="text-text-dim">· {entry.hoursPlayed}h</span>}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
