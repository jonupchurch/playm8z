import { requireRole } from "@/lib/auth/require-role";
import { getDashboardKpis } from "@/lib/admin/get-dashboard-kpis";
import { getActivityChart } from "@/lib/admin/get-activity-chart";
import { getNeedsAttention } from "@/lib/admin/get-needs-attention";
import { getTopGames } from "@/lib/admin/get-top-games";
import { getRecentActivity } from "@/lib/admin/get-recent-activity";
import { KpiCard } from "@/components/admin/kpi-card";
import { ActivityChart } from "@/components/admin/activity-chart";
import { NeedsAttention } from "@/components/admin/needs-attention";
import { RecentActivity } from "@/components/admin/recent-activity";
import { TopGames } from "@/components/admin/top-games";

// FR-001: gated to moderator-or-higher, reusing Error Pages'
// require-role.ts (its second real consumer, after Content Page/014).
// Denial renders that helper's own forbidden()/unauthorized() page --
// this route has no fallback view of its own. The admin sidebar shell
// is Design System infrastructure, out of this feature's scope
// (docs/feature-list.md) -- this page owns only the main content area.
export default async function AdminDashboardPage() {
  await requireRole("moderator");

  const [kpis, chart, needsAttention, topGames, recentActivity] = await Promise.all([
    getDashboardKpis(),
    getActivityChart(),
    getNeedsAttention(),
    getTopGames(),
    getRecentActivity(),
  ]);

  return (
    <main className="grow bg-bg px-8 py-9 text-text">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-text">Dashboard</h1>

        <div className="mb-6 grid grid-cols-5 gap-3.5">
          <KpiCard label="Total users" value={kpis.totalUsers} />
          <KpiCard label="Active today" value={kpis.activeToday} />
          <KpiCard label="New signups" value={kpis.newSignupsToday} />
          <KpiCard label="Live postings" value={kpis.livePostings} />
          <KpiCard label="Open reports" value={kpis.openReports} alert={kpis.openReports > 0} />
        </div>

        <div className="grid grid-cols-[1.7fr_1fr] gap-5">
          <div className="flex flex-col gap-5">
            <ActivityChart days={chart} />
            <RecentActivity items={recentActivity} />
          </div>
          <div className="flex flex-col gap-5">
            <NeedsAttention counts={needsAttention} />
            <TopGames games={topGames} />
          </div>
        </div>
      </div>
    </main>
  );
}
