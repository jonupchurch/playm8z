"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSafetySettings } from "@/lib/actions/save-safety-settings";
import type { Settings } from "@/lib/settings/get-settings";

// FR-011: only "Discoverable profiles by default" remains here as a
// real, saved toggle -- spec.md's Input drops the wireframe's minimum-
// signup-age control (ADR 0002 fixes this at 18+, non-configurable),
// "Require email verification" (already a hardcoded requirement),
// "Auto-hide reported content" (the SAME mechanism as Moderation's own
// auto-hide switch, not a second one), and "Sync blocklists across
// devices" (no per-device concept exists in this project).
export function SettingsSafety({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [discoverableByDefault, setDiscoverableByDefault] = useState(settings.discoverableByDefault);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveSafetySettings({ discoverableByDefault });
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
        <h2 className="text-lg font-bold text-text">Safety</h2>
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
        <div className="flex items-center gap-3.5 py-3.5">
          <div className="flex-1">
            <div className="text-sm font-semibold text-text">Discoverable profiles by default</div>
            <div className="text-xs text-text-dim">New profiles appear in search.</div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <span className="sr-only">Discoverable profiles by default</span>
            <input
              type="checkbox"
              checked={discoverableByDefault}
              onChange={() => setDiscoverableByDefault(!discoverableByDefault)}
              className="peer sr-only"
            />
            <span className="h-5.5 w-10 rounded-full bg-surface peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2" />
            <span className="pointer-events-none absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform peer-checked:translate-x-4.5" />
          </label>
        </div>
      </div>
    </div>
  );
}
