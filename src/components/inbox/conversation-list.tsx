"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { relativeAge } from "@/components/listings/listing-card";
import { Avatar } from "@/components/ui/avatar";
import { ComposeModal } from "@/components/inbox/compose-modal";
import type { InboxItem } from "@/lib/inbox/get-inbox-list";

// FR-002/FR-003: the list is scoped to a single user's own inbox (a
// bounded, single-parent list, not one that grows indefinitely across
// all users) -- so search filters client-side against the already-
// fetched list, the same architectural choice Forum Thread's reply
// sort made, not Forum index's server-side/URL-driven filtering.
export function ConversationList({ items }: { items: InboxItem[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => `${item.name} ${item.context}`.toLowerCase().includes(q))
    : items;

  const unreadTotal = items.reduce((sum, item) => sum + (item.unreadCount > 0 ? 1 : 0), 0);

  return (
    <div className="flex h-full flex-col border-r border-border bg-surface">
      <div className="shrink-0 p-4.5 pb-3">
        <div className="mb-3.5 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text">Messages</h1>
          <div className="flex items-center gap-2.5">
            {unreadTotal > 0 && (
              <span className="rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-2 py-0.5 font-mono text-[10px] font-bold text-on-accent">
                {unreadTotal}
              </span>
            )}
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3 py-1.5 text-xs font-bold text-on-accent"
            >
              <span aria-hidden="true">＋</span> New
            </button>
          </div>
        </div>

        <label htmlFor="inbox-search" className="sr-only">
          Search messages
        </label>
        <input
          id="inbox-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search messages…"
          className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none placeholder:text-text-dim"
        />
      </div>

      <nav aria-label="Conversations" className="flex-1 overflow-y-auto px-2.5 pb-3.5">
        {filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-text-dim">
            {items.length === 0 ? "No conversations yet." : "No matches."}
          </p>
        )}
        {filtered.map((item) => {
          const isActive = pathname === `/inbox/${item.id}`;
          const hasUnread = item.unreadCount > 0;
          const initial = (item.name.replace("@", "").trim()[0] || "P").toUpperCase();
          return (
            <Link
              key={item.id}
              href={`/inbox/${item.id}`}
              className={`mb-0.5 flex gap-3 rounded-xl border p-2.5 transition-colors ${
                isActive ? "border-border bg-surface-2" : "border-transparent hover:bg-surface-2"
              }`}
            >
              {item.isGroup ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] text-base font-bold text-on-accent">
                  {initial}
                </div>
              ) : (
                <Avatar
                  avatarImage={item.avatarImage}
                  googleImage={item.image}
                  avatarColor={item.avatarColor}
                  handle={item.name.replace("@", "")}
                  className="h-11 w-11 shrink-0 rounded-xl text-base"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${hasUnread ? "font-bold text-text" : "font-semibold text-text"}`}>
                    {item.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-text-dim">
                    {relativeAge(item.lastActivityAt)}
                  </span>
                </div>
                <div className="mb-0.5 truncate font-mono text-[10px] text-accent">{item.context}</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`truncate text-xs ${hasUnread ? "text-text" : "text-text-dim"}`}
                  >
                    {item.preview}
                  </span>
                  {hasUnread && (
                    <span className="ml-auto flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-1 font-mono text-[10px] font-bold text-on-accent">
                      {item.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  );
}
