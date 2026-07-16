import { getCurrentRole, requireRole } from "@/lib/auth/require-role";
import { getNewsPosts } from "@/lib/admin/get-news-posts";
import { newsPostIdParamSchema } from "@/lib/validations/admin-news";
import { NewsPostList } from "@/components/admin/news-post-list";
import { NewsPostEditor } from "@/components/admin/news-post-editor";

// FR-001: gated to moderator-or-higher, reusing Error Pages'
// require-role.ts (its eighth real consumer, after Content Page/014,
// Admin Dashboard/015, Admin Users/016, Admin Postings/017, Admin
// Forum/018, and Admin Reports/019). The admin sidebar shell is
// Design System infra, out of this feature's scope, same as every
// prior admin feature. research.md #6: this list is small/bounded (an
// admin CMS, not Browse's/Forum's unbounded scale) -- fetch everything
// once, filter client-side in the list component, rather than a
// searchParams-paginated query.
export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("moderator");
  const role = await getCurrentRole();

  const rawParams = await searchParams;
  const postId = newsPostIdParamSchema.parse(rawParams.postId);

  const posts = await getNewsPosts();
  const selectedPost = postId ? (posts.find((post) => post.id === postId) ?? null) : null;

  return (
    <main className="grid grow grid-cols-[308px_1fr] bg-bg text-text">
      <NewsPostList posts={posts} />
      <NewsPostEditor key={selectedPost?.id ?? "new"} post={selectedPost} isAdmin={role === "admin"} />
    </main>
  );
}
