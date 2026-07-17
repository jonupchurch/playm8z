"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameImage } from "@/components/games/game-image";
import { generatedVisual } from "@/lib/games/generated-visual";
import type { AdminGame } from "@/lib/games/get-admin-games";
import type { ResolvedGameImage } from "@/lib/games/resolve-game-image";
import {
  addGameAlias,
  createGame,
  disableGame,
  enableGame,
  removeGameAlias,
  removeGameImage,
  uploadGameImage,
} from "@/lib/actions/manage-game";
import {
  acceptAliasSuggestion,
  dismissAliasSuggestion,
  suggestGameAliases,
  type AliasSuggestion,
} from "@/lib/actions/suggest-game-aliases";

function resolvedFor(game: AdminGame): ResolvedGameImage {
  return game.imageUrl
    ? { kind: "admin", url: game.imageUrl }
    : { kind: "generated", visual: generatedVisual(game.name) };
}

export function GamesManager({ initialGames }: { initialGames: AdminGame[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<AliasSuggestion[] | null>(null);
  const [suggestMsg, setSuggestMsg] = useState<string | null>(null);

  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    setBusy(true);
    try {
      const result = await fn();
      if (!result.success) setError(result.error ?? "Something went wrong.");
      else router.refresh();
      return result.success;
    } catch {
      setError("Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    const ok = await run(() => createGame(newName));
    if (ok) setNewName("");
  }

  async function handleSuggest() {
    setError(null);
    setSuggestMsg(null);
    setBusy(true);
    try {
      const result = await suggestGameAliases();
      if (!result.available) {
        setSuggestMsg("AI suggestions are unavailable right now — you can still add aliases by hand.");
        setSuggestions(null);
      } else if (result.suggestions.length === 0) {
        setSuggestMsg("No new matches to suggest.");
        setSuggestions([]);
      } else {
        setSuggestions(result.suggestions);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add a game */}
      <section className="rounded-2xl border border-border bg-surface-2 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label htmlFor="new-game" className="mb-1.5 block text-[13px] font-bold">Add a game</label>
            <input
              id="new-game"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Valorant"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent-2"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !newName.trim()}
            className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
          >
            Add game
          </button>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={busy}
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            AI: suggest aliases
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-pop-text">{error}</p>}
        {suggestMsg && <p className="mt-3 text-sm text-text-muted">{suggestMsg}</p>}
      </section>

      {/* AI suggestions awaiting approval */}
      {suggestions && suggestions.length > 0 && (
        <section className="rounded-2xl border border-accent-2/40 bg-surface-2 p-5">
          <h2 className="mb-3 text-sm font-bold">Suggested aliases — you decide</h2>
          <ul className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <li key={s.rawName} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-text-muted">&ldquo;{s.rawName}&rdquo;</span>
                <span className="text-text-dim">→</span>
                <span className="font-bold">{s.gameName}</span>
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await run(() => acceptAliasSuggestion(s.gameId, s.rawName));
                      if (ok) setSuggestions((cur) => cur?.filter((x) => x.rawName !== s.rawName) ?? null);
                    }}
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-bold text-success"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await dismissAliasSuggestion(s.rawName);
                      setSuggestions((cur) => cur?.filter((x) => x.rawName !== s.rawName) ?? null);
                    }}
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-muted"
                  >
                    Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The games */}
      {initialGames.length === 0 ? (
        <p className="text-sm text-text-muted">No games yet. Add one above.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {initialGames.map((game) => (
            <GameRow key={game.id} game={game} busy={busy} run={run} router={router} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GameRow({
  game,
  busy,
  run,
}: {
  game: AdminGame;
  busy: boolean;
  run: (fn: () => Promise<{ success: boolean; error?: string }>) => Promise<boolean>;
  router: ReturnType<typeof useRouter>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [alias, setAlias] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    await run(() => uploadGameImage(game.id, fd));
  }

  return (
    <li className={`rounded-2xl border border-border bg-surface-2 p-4 ${game.disabled ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg">
          <GameImage image={resolvedFor(game)} name={game.name} className="h-full w-full text-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold">{game.name}</span>
            {game.disabled && <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-text-dim">disabled</span>}
          </div>

          {/* aliases */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {game.aliases.map((a) => (
              <span key={a.id} className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-text-muted">
                {a.alias}
                <button type="button" disabled={busy} onClick={() => run(() => removeGameAlias(a.id))} aria-label={`Remove alias ${a.alias}`} className="text-text-dim hover:text-pop-text">×</button>
              </span>
            ))}
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && alias.trim()) {
                  const ok = await run(() => addGameAlias(game.id, alias));
                  if (ok) setAlias("");
                }
              }}
              placeholder="+ alias"
              className="w-24 rounded-full border border-dashed border-border bg-bg px-2.5 py-0.5 font-mono text-[11px] outline-none focus:border-accent-2"
            />
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-bold">
            {game.imageUrl ? "Replace image" : "Upload image"}
          </button>
          {game.imageUrl && (
            <button type="button" disabled={busy} onClick={() => run(() => removeGameImage(game.id))} className="text-xs text-text-muted hover:text-pop-text">
              Remove image
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => (game.disabled ? enableGame(game.id) : disableGame(game.id)))}
            className="text-xs text-text-muted hover:text-text"
          >
            {game.disabled ? "Enable" : "Disable"}
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
    </li>
  );
}
