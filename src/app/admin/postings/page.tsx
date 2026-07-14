import { requireRole } from "@/lib/auth/require-role";
import { getPostingQueue } from "@/lib/admin/get-posting-queue";
import { getPostingReview } from "@/lib/admin/get-posting-review";
import { searchPostingQueueSchema, postingIdParamSchema } from "@/lib/validations/admin-postings";
import { PostingQueue } from "@/components/admin/posting-queue";
import { PostingReviewDrawer } from "@/components/admin/posting-review-drawer";

// FR-001: gated to moderator-or-higher, reusing Error Pages'
// require-role.ts (its fourth real consumer, after Content Page/014,
// Admin Dashboard/015, and Admin Users/016). The admin sidebar shell
// is Design System infra, out of this feature's scope
// (docs/feature-list.md), same as those two.
export default async function AdminPostingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("moderator");

  const rawParams = await searchParams;
  const { filter } = searchPostingQueueSchema.parse(rawParams);
  const postingId = postingIdParamSchema.parse(rawParams.postingId);

  const [{ stats, rows }, review] = await Promise.all([
    getPostingQueue(filter),
    postingId ? getPostingReview(postingId) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-bg px-8 py-9 text-text">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-text">Posting moderation</h1>
          <p className="text-sm text-text-muted">
            Review reported &amp; auto-flagged game postings. Approve, remove, or action the author.
          </p>
        </div>

        <PostingQueue stats={stats} rows={rows} />
      </div>

      <PostingReviewDrawer review={review} />
    </main>
  );
}
