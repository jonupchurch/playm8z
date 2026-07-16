import { requireRole } from "@/lib/auth/require-role";
import { getAuditLog } from "@/lib/admin/get-audit-log";
import { searchAuditLogSchema } from "@/lib/validations/audit-log";
import { AuditLogList } from "@/components/admin/audit-log-list";

// FR-001: gated to moderator-or-higher (deliberately less strict than
// Admin Settings' 024 admin-only gate -- a read-only transparency tool
// for the whole moderation team, not a mutation surface), reusing
// Error Pages' require-role.ts, its tenth real consumer. The admin
// sidebar shell is Design System infra, out of this feature's scope,
// same as every prior admin feature.
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("moderator");

  const rawParams = await searchParams;
  const filters = searchAuditLogSchema.parse(rawParams);

  const { groups, actors, hasMore } = await getAuditLog(filters);

  return (
    <main className="grow bg-bg px-8 py-9 text-text">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-text">Audit log</h1>
            <p className="text-sm text-text-muted">Every moderation &amp; admin action, with who did it and why. Immutable.</p>
          </div>
        </div>

        <AuditLogList groups={groups} actors={actors} hasMore={hasMore} filters={filters} />
      </div>
    </main>
  );
}
