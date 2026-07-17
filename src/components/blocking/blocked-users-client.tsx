"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { UnblockModal, type UnblockTarget } from "./unblock-modal";
import { BlockModal } from "./block-modal";

export type BlockedUserRow = {
  blockId: string;
  handle: string;
  avatarColor: string | null;
  avatarImage?: string | null;
  image?: string | null;
  blockedAt: string;
  hasReport: boolean;
};

function formatBlockedDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// FR-001-FR-003: the list, live count, client-side search over the
// already-fetched rows, and both empty states, per the wireframe's own
// client-filtered design -- no server round trip needed for this search.
export function BlockedUsersClient({ initialBlocked }: { initialBlocked: BlockedUserRow[] }) {
  const [query, setQuery] = useState("");
  const [unblockTarget, setUnblockTarget] = useState<UnblockTarget | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialBlocked;
    return initialBlocked.filter((row) => row.handle.toLowerCase().includes(q));
  }, [initialBlocked, query]);

  const hasAny = initialBlocked.length > 0;
  const hasResults = filtered.length > 0;
  const noneAtAll = !hasAny;
  const noMatch = hasAny && !hasResults;

  const countLabel = hasAny
    ? `${initialBlocked.length} ${initialBlocked.length === 1 ? "person" : "people"} blocked`
    : "You haven't blocked anyone";

  return (
    <div>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[28px] font-bold tracking-tight text-text">Blocked users</h1>
          <p className="text-sm text-text-muted">{countLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setBlockOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4.5 py-2.5 text-sm font-bold text-on-accent"
        >
          <span aria-hidden>＋</span> Block a user
        </button>
      </div>

      <div className="mb-5.5 flex gap-3 rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
        <span aria-hidden className="shrink-0 text-lg">
          🛡️
        </span>
        <div>
          <div className="mb-1 text-sm font-bold text-text">When you block someone</div>
          <p className="text-[13px] leading-relaxed text-text-muted">
            They can&apos;t message you, apply to your parties, or invite you. You won&apos;t see their postings,
            forum posts, or profile. They aren&apos;t told they&apos;ve been blocked.
          </p>
        </div>
      </div>

      {hasAny && (
        <div className="mb-4 max-w-80">
          <label htmlFor="blocked-search" className="sr-only">
            Search blocked users
          </label>
          <input
            id="blocked-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search blocked users…"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>
      )}

      {hasResults && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
          {filtered.map((row) => (
            <div key={row.blockId} className="flex items-center gap-3.5 border-b border-border p-4 last:border-b-0">
              <Avatar
                avatarImage={row.avatarImage}
                googleImage={row.image}
                avatarColor={row.avatarColor}
                handle={row.handle}
                className="h-11 w-11 shrink-0 rounded-xl text-base opacity-85 grayscale-[0.35]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold text-text">@{row.handle}</span>
                  {row.hasReport && (
                    <span className="rounded-full border border-pop/40 bg-pop/15 px-2 py-0.5 font-mono text-[9px] font-bold text-pop-text">
                      Reported
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-text-dim">
                  blocked {formatBlockedDate(row.blockedAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setUnblockTarget({
                    blockId: row.blockId,
                    handle: row.handle,
                    avatarColor: row.avatarColor,
                    avatarImage: row.avatarImage,
                    image: row.image,
                  })
                }
                className="shrink-0 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      {noneAtAll && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-3 text-3xl">🕊️</div>
          <div className="mb-1.5 text-lg font-bold text-text">No blocked users</div>
          <p className="mb-4.5 text-sm text-text-muted">
            Anyone you block will show up here. You can unblock them anytime.
          </p>
          <button
            type="button"
            onClick={() => setBlockOpen(true)}
            className="rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5.5 py-2.5 text-sm font-bold text-on-accent"
          >
            Block a user
          </button>
        </div>
      )}

      {noMatch && (
        <div className="py-12 text-center text-sm text-text-dim">No blocked users match &ldquo;{query}&rdquo;.</div>
      )}

      <UnblockModal target={unblockTarget} onClose={() => setUnblockTarget(null)} />
      <BlockModal open={blockOpen} onClose={() => setBlockOpen(false)} />
    </div>
  );
}
