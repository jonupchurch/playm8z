import { requireRole } from "@/lib/auth/require-role";
import { searchContentPages } from "@/lib/admin/search-content-pages";
import { searchContentPagesSchema } from "@/lib/validations/admin-content-pages";
import { ContentPageTable } from "@/components/admin/content-page-table";

// FR-001: gated to moderator-or-higher, reusing Error Pages'
// require-role.ts (its ninth real consumer, after Content Page/014,
// Admin Dashboard/015, Admin Users/016, Admin Postings/017, Admin
// Forum/018, Admin Reports/019, and Admin News/020). The admin
// sidebar shell is Design System infra, out of this feature's scope,
// same as every prior admin feature.
export default async function AdminContentPagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("moderator");

  const rawParams = await searchParams;
  const filters = searchContentPagesSchema.parse(rawParams);

  const { stats, rows } = await searchContentPages(filters);

  return (
    <main className="grow bg-bg px-8 py-9 text-text">
      <div className="mx-auto max-w-7xl">
        <ContentPageTable stats={stats} rows={rows} />
      </div>
    </main>
  );
}
