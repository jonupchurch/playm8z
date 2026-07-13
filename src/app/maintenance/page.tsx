import { ErrorState } from "@/components/errors/error-state";
import { getSettings } from "@/lib/settings/get-settings";

// Must never be statically prerendered -- maintenanceMessage can change
// via a direct DB write at any time (interim pre-Admin-Settings toggle,
// research.md #2), and a frozen build-time snapshot would show a stale
// message even though proxy.ts's own gate check is always live.
export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const settings = await getSettings();
  const message =
    settings.maintenanceMessage ??
    "playm8z is briefly offline for scheduled upgrades. We'll be back online shortly — thanks for your patience.";

  return (
    <ErrorState
      eyebrow="Down for maintenance"
      code="BRB"
      title="We're re-rolling the servers"
      message={message}
      primary={{ label: "Refresh", href: "/" }}
      footnote="Thanks for your patience."
    />
  );
}
