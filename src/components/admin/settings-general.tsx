"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveGeneralSettings } from "@/lib/actions/save-general-settings";
import { toggleMaintenanceMode } from "@/lib/actions/toggle-maintenance-mode";
import type { Settings } from "@/lib/settings/get-settings";

const THEMES: { key: "dark" | "light"; label: string }[] = [
  { key: "dark", label: "Dark" },
  { key: "light", label: "Light" },
];

// FR-002/FR-003: general site metadata (no current reader, spec.md's
// own Assumptions) plus the real, long-anticipated maintenance-mode
// toggle (Error Pages, 002) -- the switch saves immediately on click
// since it's this feature's single most consequential control.
export function SettingsGeneral({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [siteName, setSiteName] = useState(settings.siteName);
  const [tagline, setTagline] = useState(settings.tagline ?? "");
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail ?? "");
  const [defaultTheme, setDefaultTheme] = useState(settings.defaultTheme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);
  const [maintenanceMessage, setMaintenanceMessage] = useState(settings.maintenanceMessage ?? "");
  const [maintenancePending, setMaintenancePending] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveGeneralSettings({ siteName, tagline, supportEmail, defaultTheme });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function handleToggleMaintenance() {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    setMaintenancePending(true);
    setMaintenanceError(null);
    const result = await toggleMaintenanceMode({ maintenanceMode: next, maintenanceMessage });
    setMaintenancePending(false);
    if (!result.success) {
      setMaintenanceMode(!next);
      setMaintenanceError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleSaveMessage() {
    setMaintenancePending(true);
    setMaintenanceError(null);
    const result = await toggleMaintenanceMode({ maintenanceMode, maintenanceMessage });
    setMaintenancePending(false);
    if (!result.success) {
      setMaintenanceError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">General</h2>
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

      <div className="flex flex-col gap-4.5 rounded-2xl border border-border bg-surface-2 p-5.5">
        <div>
          <label htmlFor="settings-site-name" className="mb-1.5 block text-sm font-semibold text-text">
            Site name
          </label>
          <input
            id="settings-site-name"
            value={siteName}
            onChange={(event) => setSiteName(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none"
          />
        </div>
        <div>
          <label htmlFor="settings-tagline" className="mb-1.5 block text-sm font-semibold text-text">
            Tagline
          </label>
          <input
            id="settings-tagline"
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none"
          />
        </div>
        <div>
          <label htmlFor="settings-support-email" className="mb-1.5 block text-sm font-semibold text-text">
            Support email
          </label>
          <input
            id="settings-support-email"
            type="email"
            value={supportEmail}
            onChange={(event) => setSupportEmail(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none"
          />
        </div>
        <div>
          <span className="mb-2 block text-sm font-semibold text-text">Default theme</span>
          <div className="flex gap-1.5">
            {THEMES.map((theme) => (
              <button
                key={theme.key}
                type="button"
                onClick={() => setDefaultTheme(theme.key)}
                aria-pressed={defaultTheme === theme.key}
                className={
                  defaultTheme === theme.key
                    ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3.5 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                    : "rounded-lg border border-border bg-surface px-3.5 py-1.5 font-mono text-[11px] font-bold text-text"
                }
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[rgba(230,199,78,0.3)] bg-[rgba(230,199,78,0.06)] p-4.5">
        <div className="mb-3 flex items-center gap-3.5">
          <div className="flex-1">
            <div className="mb-0.5 text-sm font-bold text-[#e6c74e]">Maintenance mode</div>
            <div className="text-xs text-text-muted">Takes the public site offline and shows the maintenance page. Admins keep access.</div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <span className="sr-only">Maintenance mode</span>
            <input
              type="checkbox"
              checked={maintenanceMode}
              disabled={maintenancePending}
              onChange={handleToggleMaintenance}
              className="peer sr-only"
            />
            <span className="h-5.5 w-10 rounded-full bg-surface peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2" />
            <span className="pointer-events-none absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform peer-checked:translate-x-4.5" />
          </label>
        </div>
        <label htmlFor="settings-maintenance-message" className="sr-only">
          Maintenance message
        </label>
        <div className="flex gap-2">
          <input
            id="settings-maintenance-message"
            value={maintenanceMessage}
            onChange={(event) => setMaintenanceMessage(event.target.value)}
            placeholder="Optional message shown on the maintenance page…"
            className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text outline-none"
          />
          <button
            type="button"
            disabled={maintenancePending}
            onClick={handleSaveMessage}
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-text disabled:opacity-60"
          >
            Save message
          </button>
        </div>
        {maintenanceError && (
          <p role="alert" className="mt-2 text-sm text-pop-text">
            {maintenanceError}
          </p>
        )}
      </div>
    </div>
  );
}
