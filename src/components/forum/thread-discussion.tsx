"use client";

import { useMemo, useState } from "react";
import { ReplyCard } from "@/components/forum/reply-card";
import { ReplyComposer, type QuotedReply } from "@/components/forum/reply-composer";
import type { ReplyDetail } from "@/lib/forum/get-thread";
import type { ReplySort } from "@/lib/validations/forum-thread";

const SORTS: { key: ReplySort; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "new", label: "Newest" },
  { key: "old", label: "Oldest" },
];

function sortReplies(replies: ReplyDetail[], sort: ReplySort): ReplyDetail[] {
  const sorted = replies.slice();
  if (sort === "top") sorted.sort((a, b) => b.likes - a.likes);
  else if (sort === "old") sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  else sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return sorted;
}

// FR-003: reply sort is client-side over the already-fetched list --
// a single thread's own reply count is bounded, unlike Forum index's
// ever-growing cross-category thread list (which is why that page's
// sort is server-side/URL-driven instead). Owns the ephemeral "which
// reply is being quoted" state so ReplyCard's Quote trigger and
// ReplyComposer, which are siblings, can share it.
export function ThreadDiscussion({
  threadId,
  replies,
  isLoggedIn,
}: {
  threadId: string;
  replies: ReplyDetail[];
  isLoggedIn: boolean;
}) {
  const [sort, setSort] = useState<ReplySort>("top");
  const [quoted, setQuoted] = useState<QuotedReply | null>(null);

  const sorted = useMemo(() => sortReplies(replies, sort), [replies, sort]);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-base font-bold text-text">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </span>
        <div role="radiogroup" aria-label="Sort replies" className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-wider text-text-dim uppercase">Sort</span>
          {SORTS.map((option) => (
            <label key={option.key} className="cursor-pointer">
              <input
                type="radio"
                name="reply-sort"
                checked={sort === option.key}
                onChange={() => setSort(option.key)}
                className="peer sr-only"
              />
              <span className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] font-bold text-text peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {sorted.map((reply) => (
        <ReplyCard key={reply.id} reply={reply} onQuote={setQuoted} isLoggedIn={isLoggedIn} />
      ))}

      <ReplyComposer
        threadId={threadId}
        isLoggedIn={isLoggedIn}
        quoted={quoted}
        onCancelQuote={() => setQuoted(null)}
        onPosted={() => setQuoted(null)}
      />
    </div>
  );
}
