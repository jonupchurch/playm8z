"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveListsSettings } from "@/lib/actions/save-lists-settings";
import type { Settings } from "@/lib/settings/get-settings";

// FR-005/FR-006: the one list behind Post a Game's genre chips, Browse's
// genre filter, and the landing page's genre counts -- all read it fresh
// per request, so nothing here touches those files.
//
// Reuses settings-moderation.tsx's banned-phrases chip pattern
// deliberately, so this tab inherits its visual language rather than
// inventing a second one.
export function SettingsLists({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [genres, setGenres] = useState(settings.genres);
  const [newGenre, setNewGenre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function addGenre() {
    const trimmed = newGenre.trim();
    // Case-insensitive duplicate check, but the value is stored EXACTLY
    // as typed -- "Co-op PvE" and "TTRPG" are real entries, so
    // normalising case here would mangle them (FR-014). The server
    // re-checks both rules; this is just so the admin sees it now.
    const exists = genres.some((genre) => genre.toLowerCase() === trimmed.toLowerCase());
    if (trimmed && !exists) {
      setGenres([...genres, trimmed]);
      setSaved(false);
    }
    setNewGenre("");
  }

  function removeGenre(target: string) {
    setGenres(genres.filter((genre) => genre !== target));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveListsSettings({ genres });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold tracking-tight text-text">Lists</h2>
      <p className="mb-4 text-sm text-text-muted">
        Shared lists that drive what players can pick from across the site.
      </p>

      {error && (
        <p role="alert" className="mb-3 text-sm text-pop-text">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="mb-3 text-sm text-[#8fe0a3]">
          Saved.
        </p>
      )}

      <div className="mb-4 rounded-2xl border border-border bg-surface-2 p-5.5">
        <div className="mb-1 text-sm font-bold text-text">Genres</div>
        <p className="mb-3.5 text-xs text-text-muted">
          Offered when posting a game and as filters on Browse. Removing one stops it being offered —
          postings already using it keep it.
        </p>
        <div className="mb-3.5 flex flex-wrap gap-2">
          {genres.map((genre) => (
            <span
              key={genre}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pr-1.5 pl-3 font-mono text-xs text-text"
            >
              {genre}
              <button
                type="button"
                onClick={() => removeGenre(genre)}
                aria-label={`Remove "${genre}"`}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(255,59,107,0.15)] text-[11px] text-pop-text"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor="settings-new-genre" className="sr-only">
            Add a genre
          </label>
          <input
            id="settings-new-genre"
            value={newGenre}
            onChange={(event) => setNewGenre(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addGenre();
              }
            }}
            placeholder="Add a genre…"
            className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text outline-none"
          />
          <button
            type="button"
            onClick={addGenre}
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-bold text-text"
          >
            Add
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4.5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
