import Link from "next/link";

// FR-009/FR-011: guidance copy plus a "Post this game" action carrying
// the current search term over as a starting point where practical.
export function EmptyState({ searchTerm }: { searchTerm: string }) {
  const postHref = searchTerm.trim()
    ? `/post?game=${encodeURIComponent(searchTerm.trim())}`
    : "/post";

  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="mb-2 text-lg font-bold text-text">No parties match that yet.</div>
      <p className="mb-4.5 text-sm text-text-muted">Clear a filter — or be the first to post it.</p>
      <Link
        href={postHref}
        className="inline-block rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5.5 py-2.5 text-sm font-bold text-on-accent"
      >
        Post this game
      </Link>
    </div>
  );
}
