"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveFeatureFlags } from "@/lib/actions/save-feature-flags";
import type { Settings } from "@/lib/settings/get-settings";

type FlagKey = "openSignups" | "discordFlag" | "groupsFlag" | "ratingsFlag" | "forumFlag" | "tabletopFlag";

const FLAG_TOGGLES: { key: FlagKey; label: string; description: string }[] = [
  { key: "openSignups", label: "Open signups", description: "Allow new players to register." },
  { key: "discordFlag", label: "Discord integration", description: "Auto voice channels & LFG pings." },
  { key: "groupsFlag", label: "Groups & clans", description: "Enable the groups feature." },
  { key: "ratingsFlag", label: "Player ratings", description: "Post-session rating & reviews." },
  { key: "forumFlag", label: "Community forum", description: "Enable threads & replies." },
  { key: "tabletopFlag", label: "Tabletop & TTRPG filters", description: "In-person + tabletop genres." },
];

// FR-009/FR-010/research.md #8: "Open signups" is the only flag with
// real enforcement (Auth & Onboarding's, 001, sign-up path) -- the
// other five persist but are consulted by nothing yet.
export function SettingsFeatures({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<FlagKey, boolean>>({
    openSignups: settings.openSignups,
    discordFlag: settings.discordFlag,
    groupsFlag: settings.groupsFlag,
    ratingsFlag: settings.ratingsFlag,
    forumFlag: settings.forumFlag,
    tabletopFlag: settings.tabletopFlag,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveFeatureFlags(values);
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
        <h2 className="text-lg font-bold text-text">Feature flags</h2>
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

      <div className="rounded-2xl border border-border bg-surface-2 px-5.5">
        {FLAG_TOGGLES.map((flag) => (
          <div key={flag.key} className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0">
            <div className="flex-1">
              <div className="text-sm font-semibold text-text">{flag.label}</div>
              <div className="text-xs text-text-dim">{flag.description}</div>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <span className="sr-only">{flag.label}</span>
              <input
                type="checkbox"
                checked={values[flag.key]}
                onChange={() => setValues((current) => ({ ...current, [flag.key]: !current[flag.key] }))}
                className="peer sr-only"
              />
              <span className="h-5.5 w-10 rounded-full bg-surface peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2" />
              <span className="pointer-events-none absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform peer-checked:translate-x-4.5" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
