import { requireRole } from "@/lib/auth/require-role";
import { searchAdminUsers } from "@/lib/admin/search-admin-users";
import { getUserDetail } from "@/lib/admin/get-user-detail";
import { searchAdminUsersSchema, adminUserIdParamSchema } from "@/lib/validations/admin-users";
import { UserTable } from "@/components/admin/user-table";
import { UserDrawer } from "@/components/admin/user-drawer";

// FR-001: gated to moderator-or-higher, reusing Error Pages'
// require-role.ts (its third real consumer, after Content Page/014
// and Admin Dashboard/015). The admin sidebar shell is Design System
// infra, out of this feature's scope (docs/feature-list.md), same as
// Admin Dashboard -- this page owns only the main content area.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("moderator");

  const rawParams = await searchParams;
  const filters = searchAdminUsersSchema.parse(rawParams);
  const userId = adminUserIdParamSchema.parse(rawParams.userId);

  const [{ stats, rows }, detail] = await Promise.all([
    searchAdminUsers(filters),
    userId ? getUserDetail(userId) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-bg px-8 py-9 text-text">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-text">User management</h1>
          <p className="text-sm text-text-muted">View, moderate, and administer every player account.</p>
        </div>

        <UserTable stats={stats} rows={rows} />
      </div>

      <UserDrawer detail={detail} />
    </main>
  );
}
