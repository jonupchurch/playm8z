"use client";

import { useState } from "react";
import type { Settings } from "@/lib/settings/get-settings";
import type { TeamMember } from "@/lib/admin/get-team";
import type { SettingsSection } from "@/lib/validations/admin-settings";
import { SettingsGeneral } from "@/components/admin/settings-general";
import { SettingsModeration } from "@/components/admin/settings-moderation";
import { SettingsRoles } from "@/components/admin/settings-roles";
import { SettingsFeatures } from "@/components/admin/settings-features";
import { SettingsSafety } from "@/components/admin/settings-safety";
import { SettingsLists } from "@/components/admin/settings-lists";

const SECTIONS: { key: SettingsSection; label: string; icon: string }[] = [
  { key: "general", label: "General", icon: "⚙️" },
  { key: "mod", label: "Moderation", icon: "🛡️" },
  { key: "roles", label: "Roles & access", icon: "👥" },
  { key: "features", label: "Features", icon: "🚩" },
  { key: "safety", label: "Safety", icon: "🔒" },
  { key: "lists", label: "Lists", icon: "🏷️" },
];

// Principle III: a real, keyboard-navigable tablist -- section state is
// plain client `useState` (UserDrawer/016's own tab precedent), not a
// URL param, since this page is never linked to mid-section.
export function SettingsShell({ settings, team }: { settings: Settings; team: TeamMember[] }) {
  const [section, setSection] = useState<SettingsSection>("general");

  return (
    <div className="grid grid-cols-1 gap-7 md:grid-cols-[200px_1fr]">
      <div role="tablist" aria-label="Settings sections" className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            id={`settings-tab-${s.key}`}
            aria-selected={section === s.key}
            aria-controls="settings-panel"
            onClick={() => setSection(s.key)}
            className={
              section === s.key
                ? "flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-left text-sm font-semibold whitespace-nowrap text-text"
                : "flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold whitespace-nowrap text-text-dim"
            }
          >
            <span aria-hidden="true">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      <div id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${section}`} className="min-w-0 max-w-160">
        {section === "general" && <SettingsGeneral settings={settings} />}
        {section === "mod" && <SettingsModeration settings={settings} />}
        {section === "roles" && <SettingsRoles team={team} />}
        {section === "features" && <SettingsFeatures settings={settings} />}
        {section === "safety" && <SettingsSafety settings={settings} />}
        {section === "lists" && <SettingsLists settings={settings} />}
      </div>
    </div>
  );
}
