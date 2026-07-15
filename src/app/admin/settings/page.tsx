import { requireRole } from "@/lib/auth/require-role";
import { getSettings } from "@/lib/settings/get-settings";
import { getTeam } from "@/lib/admin/get-team";
import { SettingsShell } from "@/components/admin/settings-shell";

// FR-001: gated at admin specifically -- stricter than every other
// /admin/* page's moderator minimum, given this page's sensitivity
// (spec.md's Input). The admin sidebar shell is Design System infra,
// out of this feature's scope, same as every prior admin feature.
export default async function AdminSettingsPage() {
  await requireRole("admin");

  const [settings, team] = await Promise.all([getSettings(), getTeam()]);

  return (
    <main className="min-h-screen bg-bg px-8 py-9 text-text">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="mb-1 text-[26px] font-bold tracking-tight text-text">Settings</h1>
          <p className="text-sm text-text-muted">Configure the platform, moderation rules, team access &amp; features.</p>
        </div>
        <SettingsShell settings={settings} team={team} />
      </div>
    </main>
  );
}
