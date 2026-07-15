"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveModerationSettings } from "@/lib/actions/save-moderation-settings";
import type { AutoEscalateSeverity } from "@/lib/validations/admin-settings";
import type { Settings } from "@/lib/settings/get-settings";

const FILTER_TOGGLES: { key: "phraseFilterEnabled" | "linkFilterEnabled" | "boostFilterEnabled" | "newAccountReviewEnabled"; label: string; description: string }[] = [
  { key: "phraseFilterEnabled", label: "Banned-phrase filter", description: "Auto-flag content matching the banned phrases list." },
  { key: "linkFilterEnabled", label: "External-link filter", description: "Flag posts with outbound links or invite URLs." },
  { key: "boostFilterEnabled", label: "Boosting-keyword filter", description: "Catch paid-boosting and account-sale ads." },
  { key: "newAccountReviewEnabled", label: "New-account review", description: "Route the first post from brand-new accounts to review." },
];

const SEVERITY_OPTIONS: { key: AutoEscalateSeverity; label: string }[] = [
  { key: "low", label: "Low+" },
  { key: "med", label: "Medium+" },
  { key: "high", label: "High only" },
];

// FR-004/FR-005/FR-006: real config for auto-flag-rules.ts (017/018),
// the computed auto-hide rule (003/004/009), and the display-only
// ban-review severity badge (017/018/019).
export function SettingsModeration({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [phraseFilterEnabled, setPhraseFilterEnabled] = useState(settings.phraseFilterEnabled);
  const [linkFilterEnabled, setLinkFilterEnabled] = useState(settings.linkFilterEnabled);
  const [boostFilterEnabled, setBoostFilterEnabled] = useState(settings.boostFilterEnabled);
  const [newAccountReviewEnabled, setNewAccountReviewEnabled] = useState(settings.newAccountReviewEnabled);
  const [bannedPhrases, setBannedPhrases] = useState(settings.bannedPhrases);
  const [newPhrase, setNewPhrase] = useState("");
  const [autoHideEnabled, setAutoHideEnabled] = useState(settings.autoHideEnabled);
  const [autoHideThreshold, setAutoHideThreshold] = useState(settings.autoHideThreshold);
  const [autoEscalateSeverity, setAutoEscalateSeverity] = useState(settings.autoEscalateSeverity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggles = [
    { ...FILTER_TOGGLES[0], value: phraseFilterEnabled, setValue: setPhraseFilterEnabled },
    { ...FILTER_TOGGLES[1], value: linkFilterEnabled, setValue: setLinkFilterEnabled },
    { ...FILTER_TOGGLES[2], value: boostFilterEnabled, setValue: setBoostFilterEnabled },
    { ...FILTER_TOGGLES[3], value: newAccountReviewEnabled, setValue: setNewAccountReviewEnabled },
  ];

  function addPhrase() {
    const trimmed = newPhrase.trim().toLowerCase();
    if (trimmed && !bannedPhrases.includes(trimmed)) {
      setBannedPhrases([...bannedPhrases, trimmed]);
    }
    setNewPhrase("");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveModerationSettings({
      phraseFilterEnabled,
      linkFilterEnabled,
      boostFilterEnabled,
      newAccountReviewEnabled,
      bannedPhrases,
      autoHideEnabled,
      autoHideThreshold,
      autoEscalateSeverity,
    });
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
      <div className="mb-4.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">Moderation & auto-flag</h2>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4.5 py-2 text-sm font-bold text-on-accent disabled:opacity-60"
        >
          Save
        </button>
      </div>

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

      <div className="mb-4 rounded-2xl border border-border bg-surface-2 px-5.5">
        {toggles.map((toggle) => (
          <div key={toggle.key} className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0">
            <div className="flex-1">
              <div className="text-sm font-semibold text-text">{toggle.label}</div>
              <div className="text-xs text-text-dim">{toggle.description}</div>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <span className="sr-only">{toggle.label}</span>
              <input
                type="checkbox"
                checked={toggle.value}
                onChange={() => toggle.setValue(!toggle.value)}
                className="peer sr-only"
              />
              <span className="h-5.5 w-10 rounded-full bg-surface peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2" />
              <span className="pointer-events-none absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform peer-checked:translate-x-4.5" />
            </label>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-surface-2 p-5.5">
        <div className="mb-1 text-sm font-bold text-text">Banned phrases</div>
        <p className="mb-3.5 text-xs text-text-dim">Content containing these is auto-flagged for review.</p>
        <div className="mb-3.5 flex flex-wrap gap-2">
          {bannedPhrases.map((phrase) => (
            <span
              key={phrase}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pr-1.5 pl-3 font-mono text-xs text-text"
            >
              {phrase}
              <button
                type="button"
                onClick={() => setBannedPhrases(bannedPhrases.filter((p) => p !== phrase))}
                aria-label={`Remove "${phrase}"`}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(255,59,107,0.15)] text-[11px] text-pop-text"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor="settings-new-phrase" className="sr-only">
            Add a banned phrase
          </label>
          <input
            id="settings-new-phrase"
            value={newPhrase}
            onChange={(event) => setNewPhrase(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addPhrase();
              }
            }}
            placeholder="Add a phrase…"
            className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text outline-none"
          />
          <button type="button" onClick={addPhrase} className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-bold text-text">
            Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-semibold text-text">Auto-hide after</div>
            <div className="text-xs text-text-dim">Hide content pending review once it hits this many reports.</div>
          </div>
          <div className="flex items-center gap-2.5">
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <span className="sr-only">Enable auto-hide</span>
              <input type="checkbox" checked={autoHideEnabled} onChange={() => setAutoHideEnabled(!autoHideEnabled)} className="peer sr-only" />
              <span className="h-5.5 w-10 rounded-full bg-surface peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2" />
              <span className="pointer-events-none absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform peer-checked:translate-x-4.5" />
            </label>
            <button
              type="button"
              aria-label="Decrease auto-hide threshold"
              onClick={() => setAutoHideThreshold(Math.max(1, autoHideThreshold - 1))}
              className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-border bg-surface text-lg text-text"
            >
              −
            </button>
            <span className="min-w-4.5 text-center text-lg font-bold text-text">{autoHideThreshold}</span>
            <button
              type="button"
              aria-label="Increase auto-hide threshold"
              onClick={() => setAutoHideThreshold(Math.min(20, autoHideThreshold + 1))}
              className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-border bg-surface text-lg text-text"
            >
              +
            </button>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <div className="mb-2.5 text-sm font-semibold text-text">Auto-escalate to ban review at severity</div>
          <div className="flex gap-1.5">
            {SEVERITY_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setAutoEscalateSeverity(option.key)}
                aria-pressed={autoEscalateSeverity === option.key}
                className={
                  autoEscalateSeverity === option.key
                    ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3.5 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                    : "rounded-lg border border-border bg-surface px-3.5 py-1.5 font-mono text-[11px] font-bold text-text"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
