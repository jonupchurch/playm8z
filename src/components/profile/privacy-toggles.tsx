"use client";

import { useState } from "react";
import { updatePrivacy } from "@/lib/actions/update-privacy";
import type { PrivacyKey } from "@/lib/validations/profile";

const PRIVACY_ROWS: { key: PrivacyKey; label: string; description: string }[] = [
  { key: "privacyShowAge", label: "Show age group", description: "Display 18+ on your public profile" },
  { key: "privacyShowRegion", label: "Show region", description: "Let players see your region" },
  { key: "privacyShowOnline", label: "Show online status", description: "Appear online when you're active" },
  { key: "privacyDiscoverable", label: "Discoverable profile", description: "Let others find you in search" },
];

export type PrivacyState = Record<PrivacyKey, boolean>;

// FR-012: each toggle persists independently. Consumed by the
// not-yet-spec'd Public Profile feature -- this page only stores the
// preference (spec.md Assumptions).
export function PrivacyToggles({ initial }: { initial: PrivacyState }) {
  const [state, setState] = useState<PrivacyState>(initial);

  async function handleToggle(key: PrivacyKey) {
    const next = !state[key];
    setState((current) => ({ ...current, [key]: next }));
    const result = await updatePrivacy(key, next);
    if (!result.success) {
      setState((current) => ({ ...current, [key]: !next }));
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-6">
      <h2 className="mb-5 text-lg font-bold text-text">Privacy</h2>
      <div className="flex flex-col">
        {PRIVACY_ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between border-b border-border py-3.5 last:border-b-0">
            <div>
              <div className="text-sm font-bold text-text">{row.label}</div>
              <div className="text-xs text-text-dim">{row.description}</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <span className="sr-only">{row.label}</span>
              <input
                type="checkbox"
                checked={state[row.key]}
                onChange={() => handleToggle(row.key)}
                className="peer sr-only"
              />
              <span className="h-5.5 w-10 rounded-full bg-surface peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2" />
              <span className="pointer-events-none absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform peer-checked:translate-x-4.5" />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
