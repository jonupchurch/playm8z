import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { categoryDot, categoryLabel } from "@/lib/forum/categories";
import { relativeAge } from "@/components/listings/listing-card";
import type { ForumThreadRow } from "@/lib/forum/search-threads";

const SNIPPET_LENGTH = 140;

function snippet(body: string): string {
  const trimmed = body.trim();
  return trimmed.length > SNIPPET_LENGTH ? `${trimmed.slice(0, SNIPPET_LENGTH)}…` : trimmed;
}

function formatCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// FR-005: PINNED (moderator-set, stored, read-only here) takes
// precedence over HOT (computed at read time, search-threads.ts) --
// never both, never neither unless it qualifies for neither. Author
// identity is always @handle, never display name (ADR 0006).
export function ThreadRow({ thread }: { thread: ForumThreadRow }) {
  const badge = thread.pinned ? { label: "PINNED", className: "bg-accent text-on-accent" } : thread.hot ? { label: "HOT", className: "bg-pop text-on-accent" } : null;

  return (
    <Link
      href={`/forum/thread/${thread.id}`}
      className="flex gap-3.5 border-b border-border p-4.5 transition-colors last:border-b-0 hover:bg-surface"
    >
      <Avatar
        avatarImage={thread.authorAvatarImage}
        googleImage={thread.authorImage}
        avatarColor={thread.authorAvatarColor}
        handle={thread.authorHandle}
        className="h-10.5 w-10.5 shrink-0 rounded-xl text-base"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {badge && (
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
          <span className="text-[15px] leading-snug font-bold text-text">{thread.title}</span>
        </div>
        <p className="mb-2 text-[12.5px] leading-relaxed text-text-dim">{snippet(thread.body)}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            style={{
              color: categoryDot(thread.categoryId),
              backgroundColor: `color-mix(in srgb, ${categoryDot(thread.categoryId)} 14%, transparent)`,
              borderColor: `color-mix(in srgb, ${categoryDot(thread.categoryId)} 38%, transparent)`,
            }}
            className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold"
          >
            {categoryLabel(thread.categoryId)}
          </span>
          {thread.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-text-muted"
            >
              #{tag}
            </span>
          ))}
          <span className="ml-0.5 font-mono text-[10px] text-text-dim">
            @{thread.authorHandle} · {relativeAge(thread.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-2 pl-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[15px] font-bold ${thread.replyCount === 0 ? "text-text-dim" : "text-accent"}`}>
            {thread.replyCount}
          </span>
          <span className="font-mono text-[9px] text-text-dim">replies</span>
        </div>
        <div className="font-mono text-[10px] text-text-dim">{formatCount(thread.viewCount)} views</div>
      </div>
    </Link>
  );
}
