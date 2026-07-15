import { requireRole } from "@/lib/auth/require-role";
import { getForumQueue } from "@/lib/admin/get-forum-queue";
import { getForumReview } from "@/lib/admin/get-forum-review";
import { searchForumQueueSchema, forumTargetTypeParamSchema, forumTargetIdParamSchema } from "@/lib/validations/admin-forum";
import { ForumQueue } from "@/components/admin/forum-queue";
import { ForumReviewDrawer } from "@/components/admin/forum-review-drawer";

// FR-001: gated to moderator-or-higher, reusing Error Pages'
// require-role.ts (its fifth real consumer, after Content Page/014,
// Admin Dashboard/015, Admin Users/016, and Admin Postings/017). The
// admin sidebar shell is Design System infra, out of this feature's
// scope, same as every prior admin feature.
export default async function AdminForumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("moderator");

  const rawParams = await searchParams;
  const { filter } = searchForumQueueSchema.parse(rawParams);
  const targetType = forumTargetTypeParamSchema.parse(rawParams.targetType);
  const targetId = forumTargetIdParamSchema.parse(rawParams.targetId);

  const [{ stats, rows }, review] = await Promise.all([
    getForumQueue(filter),
    targetType && targetId ? getForumReview(targetType, targetId) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-bg px-8 py-9 text-text">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-text">Forum moderation</h1>
          <p className="text-sm text-text-muted">
            Review reported &amp; auto-flagged threads and replies. Approve, remove, lock, or action the author.
          </p>
        </div>

        <ForumQueue stats={stats} rows={rows} />
      </div>

      <ForumReviewDrawer review={review} />
    </main>
  );
}
