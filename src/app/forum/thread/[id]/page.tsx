import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getThread } from "@/lib/forum/get-thread";
import { incrementViewCount } from "@/lib/forum/increment-view-count";
import { categoryDot, categoryLabel } from "@/lib/forum/categories";
import { relativeAge } from "@/components/listings/listing-card";
import { OriginalPost } from "@/components/forum/original-post";
import { ThreadDiscussion } from "@/components/forum/thread-discussion";
import { ThreadRightRail } from "@/components/forum/thread-right-rail";
import { SubscribeButton } from "@/components/forum/subscribe-button";
import { ShareButton } from "@/components/forum/share-button";

// FR-001: public, no login required to read. FR-005: increments the
// view count once per page load, no per-visitor dedup -- incremented
// before the read so the number shown reflects this very visit.
export default async function ForumThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await incrementViewCount(id);

  const session = await auth();
  const isLoggedIn = !!session?.user?.email;
  let viewerId: string | undefined;
  if (isLoggedIn) {
    const [viewer] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session!.user!.email!));
    viewerId = viewer?.id;
  }

  const thread = await getThread(id, "top", viewerId);
  if (!thread) {
    notFound();
  }

  const badge = thread.pinned
    ? { label: "PINNED", className: "bg-accent text-on-accent" }
    : thread.hot
      ? { label: "HOT", className: "bg-pop text-on-accent" }
      : null;

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-285 px-8 py-6">
        <nav className="mb-4.5 font-mono text-[11px] text-text-dim" aria-label="Breadcrumb">
          <Link href="/forum" className="text-text-muted underline underline-offset-2">
            Forum
          </Link>{" "}
          <span>/</span>{" "}
          <Link
            href={`/forum?category=${thread.categoryId}`}
            className="text-text-muted underline underline-offset-2"
          >
            {categoryLabel(thread.categoryId)}
          </Link>{" "}
          <span>/</span> <span>{thread.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  style={{
                    color: categoryDot(thread.categoryId),
                    backgroundColor: `color-mix(in srgb, ${categoryDot(thread.categoryId)} 14%, transparent)`,
                    borderColor: `color-mix(in srgb, ${categoryDot(thread.categoryId)} 38%, transparent)`,
                  }}
                  className="rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold"
                >
                  {categoryLabel(thread.categoryId)}
                </span>
                {badge && (
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
              <h1 className="mb-3.5 text-2xl leading-tight font-bold tracking-tight text-text">{thread.title}</h1>
              <div className="flex flex-wrap items-center gap-3.5">
                <div>
                  <span className="text-sm font-semibold text-text">@{thread.authorHandle}</span>
                  <span className="ml-2 font-mono text-[10px] text-text-dim">
                    started this · {relativeAge(thread.createdAt)}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-text-muted">
                  {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"} · {thread.viewCount.toLocaleString()}{" "}
                  views
                </span>
                <div className="ml-auto flex gap-2">
                  <SubscribeButton
                    threadId={thread.id}
                    initialSubscribed={thread.isSubscribedByViewer}
                    isLoggedIn={isLoggedIn}
                  />
                  <ShareButton />
                </div>
              </div>
            </div>

            <OriginalPost thread={thread} isLoggedIn={isLoggedIn} />

            <ThreadDiscussion threadId={thread.id} replies={thread.replies} isLoggedIn={isLoggedIn} />
          </div>

          <ThreadRightRail thread={thread} />
        </div>
      </div>
    </main>
  );
}
