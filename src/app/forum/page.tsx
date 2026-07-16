import { auth } from "@/auth";
import { forumSearchParamsSchema } from "@/lib/validations/forum";
import { getCategoryCounts, searchThreads } from "@/lib/forum/search-threads";
import { getForumStats } from "@/lib/forum/get-forum-stats";
import { ForumControls } from "@/components/forum/forum-controls";
import { ThreadRow } from "@/components/forum/thread-row";
import { RightRail } from "@/components/forum/right-rail";
import { NewThreadTrigger } from "@/components/forum/new-thread-trigger";

// Public (no authentication required, per FR-001) -- reading the forum
// never requires a login; only creating a thread does
// (new-thread-trigger.tsx). Category/search/sort state lives in the
// URL and drives a real server-side query (research.md #2), same
// precedent as Browse, since threads accumulate indefinitely unlike
// Home's small recent slice.
export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const filters = forumSearchParamsSchema.parse(rawParams);

  const session = await auth();
  const isLoggedIn = !!session?.user?.email;

  const [threads, categoryCounts, stats] = await Promise.all([
    searchThreads(filters),
    getCategoryCounts(),
    getForumStats(),
  ]);

  const isEmpty = threads.length === 0;

  return (
    <main className="grow bg-bg text-text">
      <div
        className="border-b border-border"
        style={{
          backgroundImage: "radial-gradient(circle at 25% -40%, rgba(255,59,107,0.09), transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-300 flex-wrap items-end justify-between gap-4 px-8 pt-7 pb-5.5 md:flex">
          <div>
            <h1 className="mb-1 text-[30px] font-bold tracking-tight">Community forum</h1>
            <p className="text-sm text-text-muted">Talk games, strategy, groups &amp; everything in between.</p>
          </div>
          <NewThreadTrigger
            isLoggedIn={isLoggedIn}
            className="mt-4 inline-block rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5.5 py-3 text-sm font-bold text-on-accent md:mt-0"
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-300 grid-cols-1 gap-7 px-8 py-6 lg:grid-cols-[1fr_300px]">
        <div>
          <ForumControls categoryCounts={categoryCounts} />

          {!isEmpty && (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
              {threads.map((thread) => (
                <ThreadRow key={thread.id} thread={thread} />
              ))}
            </div>
          )}

          {isEmpty && (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="mb-2 text-lg font-bold text-text">No threads here yet.</div>
              <p className="mb-4.5 text-sm text-text-muted">Be the first to start the conversation.</p>
              <NewThreadTrigger
                isLoggedIn={isLoggedIn}
                className="inline-block rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5.5 py-3 text-sm font-bold text-on-accent"
              />
            </div>
          )}
        </div>

        <RightRail
          memberCount={stats.memberCount}
          threadCount={stats.threadCount}
          trendingTags={stats.trendingTags}
        />
      </div>
    </main>
  );
}
