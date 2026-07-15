import { requireRole } from "@/lib/auth/require-role";
import { getReportsQueue } from "@/lib/admin/get-reports-queue";
import { getReportReview } from "@/lib/admin/get-report-review";
import { searchReportsQueueSchema, reportTargetTypeParamSchema, reportTargetIdParamSchema } from "@/lib/validations/admin-reports";
import { ReportsQueue } from "@/components/admin/reports-queue";
import { ReportReviewDrawer } from "@/components/admin/report-review-drawer";

// FR-001: gated to moderator-or-higher, reusing Error Pages'
// require-role.ts (its sixth real consumer, after Content Page/014,
// Admin Dashboard/015, Admin Users/016, Admin Postings/017, and Admin
// Forum/018). The admin sidebar shell is Design System infra, out of
// this feature's scope, same as every prior admin feature.
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("moderator");

  const rawParams = await searchParams;
  const { filter } = searchReportsQueueSchema.parse(rawParams);
  const targetType = reportTargetTypeParamSchema.parse(rawParams.targetType);
  const targetId = reportTargetIdParamSchema.parse(rawParams.targetId);

  const [{ stats, rows }, review] = await Promise.all([
    getReportsQueue(filter),
    targetType && targetId ? getReportReview(targetType, targetId) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-bg px-8 py-9 text-text">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-text">Reports</h1>
          <p className="text-sm text-text-muted">
            Every user report across postings, forum, profiles &amp; messages — triage in one place.
          </p>
        </div>

        <ReportsQueue stats={stats} rows={rows} />
      </div>

      <ReportReviewDrawer review={review} />
    </main>
  );
}
