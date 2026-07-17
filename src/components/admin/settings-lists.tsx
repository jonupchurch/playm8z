"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { saveListsSettings } from "@/lib/actions/save-lists-settings";
import type { Settings } from "@/lib/settings/get-settings";

// 030 (genres) + 031 (suggested games): the Lists tab. Both are flat,
// admin-editable string lists, so they share one editor, one save, and
// one audit entry rather than two of each.
//
// Reuses settings-moderation.tsx's banned-phrases chip pattern
// deliberately, so this tab inherits its visual language instead of
// inventing a second one.
export function SettingsLists({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [genres, setGenres] = useState(settings.genres);
  const [suggestedGames, setSuggestedGames] = useState(settings.suggestedGames);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveListsSettings({ genres, suggestedGames });
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

      <ChipListEditor
        title="Genres"
        description="Offered when posting a game and as filters on Browse. Removing one stops it being offered — postings already using it keep it."
        addLabel="Add a genre"
        placeholder="Add a genre…"
        noun="genre"
        items={genres}
        onChange={(next) => {
          setGenres(next);
          setSaved(false);
        }}
      />

      <ChipListEditor
        title="Suggested games"
        description="Offered to new players while they create their account. Only a suggestion — players can always add any game they like from their profile."
        addLabel="Add a suggested game"
        placeholder="Add a game…"
        noun="game"
        items={suggestedGames}
        onChange={(next) => {
          setSuggestedGames(next);
          setSaved(false);
        }}
      />

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

function ChipListEditor({
  title,
  description,
  addLabel,
  placeholder,
  noun,
  items,
  onChange,
}: {
  title: string;
  description: string;
  addLabel: string;
  placeholder: string;
  noun: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    // Case-insensitive duplicate check, but the value is stored EXACTLY
    // as typed -- "Co-op PvE", "Baldur's Gate 3" and "Magic: The
    // Gathering" are real entries, so normalising here would mangle
    // them. The server re-checks both rules; this is just so the admin
    // sees it immediately.
    const exists = items.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (trimmed && !exists) onChange([...items, trimmed]);
    setDraft("");
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-1 text-sm font-bold text-text">{title}</div>
      <p className="mb-3.5 text-xs text-text-muted">{description}</p>
      <div className="mb-3.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pr-1.5 pl-3 font-mono text-xs text-text"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((candidate) => candidate !== item))}
              // Names WHICH item it removes -- a wall of identical
              // "Remove" buttons is useless to a screen reader.
              aria-label={`Remove "${item}"`}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(255,59,107,0.15)] text-[11px] text-pop-text"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {addLabel}
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text outline-none"
        />
        <button
          type="button"
          onClick={add}
          aria-label={`Add ${noun}`}
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-bold text-text"
        >
          Add
        </button>
      </div>
    </div>
  );
}
