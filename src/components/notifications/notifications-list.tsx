"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptRequest } from "@/lib/actions/accept-request";
import { declineRequest } from "@/lib/actions/decline-request";
import { markAllRead } from "@/lib/actions/mark-all-read";
import { markNotificationRead } from "@/lib/actions/mark-notification-read";
import {
  filterAndGroupNotifications,
  type NotificationFilter,
  type NotificationItem,
} from "@/lib/notifications/filter-notifications";
import { relativeAge } from "@/components/listings/listing-card";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";

const TYPE_ICON: Record<string, { icon: string; bg: string }> = {
  join: { icon: "👥", bg: "#ffb000" },
  accepted: { icon: "✓", bg: "#4ec96a" },
  reply: { icon: "💬", bg: "#35d0e0" },
  mention: { icon: "@", bg: "#ff3b6b" },
  message: { icon: "✉️", bg: "#ff6b1a" },
  rating: { icon: "★", bg: "#ffb000" },
  news: { icon: "📰", bg: "#ff6b1a" },
  system: { icon: "🔔", bg: "#ff6b1a" },
};

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "requests", label: "Requests" },
  { key: "forum", label: "Forum" },
  { key: "system", label: "System" },
];

function avatarGradient(color: string | null) {
  return AVATAR_COLORS.find((swatch) => swatch.id === color)?.gradient ?? AVATAR_COLORS[0].gradient;
}

// FR-005/research.md #2: Accept/Decline call Inbox's (011) existing
// Server Actions directly -- no duplicated accept/decline logic. On
// accept, navigates to the new conversation (same destination Inbox's
// own RequestBanner uses); on decline, refreshes in place so the row
// flips to its resolved state without leaving the notifications page.
function RequestRow({ item }: { item: Extract<NotificationItem, { kind: "request" }> }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setSubmitting("accept");
    setError(null);
    const result = await acceptRequest({ applicationId: item.id });
    setSubmitting(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/inbox/${result.conversationId}`);
  }

  async function handleDecline() {
    setSubmitting("decline");
    setError(null);
    const result = await declineRequest({ applicationId: item.id });
    setSubmitting(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label={`Request from @${item.actorHandle}`}
      className="flex gap-3 border-b border-border/60 px-4 py-3.5 last:border-b-0"
    >
      <div className="relative shrink-0">
        <div
          style={{ background: avatarGradient(item.actorAvatarColor) }}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-on-accent"
        >
          {item.actorHandle.trim()[0]?.toUpperCase() || "P"}
        </div>
        <span
          aria-hidden="true"
          style={{ background: TYPE_ICON.join.bg }}
          className="absolute -right-1 -bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-surface-2 text-[10px]"
        >
          {TYPE_ICON.join.icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-text-muted">
          {item.unread && <span className="sr-only">Unread: </span>}
          <b className="text-text">@{item.actorHandle}</b> wants to join your party
        </p>
        <span className="font-mono text-[10px] text-text-dim">{item.context}</span>

        {item.status === "pending" ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={submitting !== null}
              className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2 text-xs font-bold text-on-accent disabled:opacity-60"
            >
              {submitting === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={submitting !== null}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-muted disabled:opacity-60"
            >
              {submitting === "decline" ? "Declining…" : "Decline"}
            </button>
          </div>
        ) : (
          <div
            className={`mt-2 font-mono text-[11px] font-bold ${
              item.status === "accepted" ? "text-success" : "text-text-muted"
            }`}
          >
            {item.resolvedText}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-pop-text">
            {error}
          </p>
        )}
      </div>
      {item.unread && (
        <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-2" />
      )}
    </div>
  );
}

// Marks read before navigating (rather than firing markNotificationRead
// alongside a plain <Link>'s own navigation) so a fast-away click can't
// lose the write -- the round trip is small, and correctness here
// (SC-001) matters more than shaving it off.
function PlainRow({ item }: { item: Extract<NotificationItem, { kind: "notification" }> }) {
  const router = useRouter();
  const meta = TYPE_ICON[item.type] ?? TYPE_ICON.system;

  async function handleClick() {
    if (item.unread) {
      await markNotificationRead({ notificationId: item.id });
    }
    router.push(item.targetRef);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full gap-3 border-b border-border/60 px-4 py-3.5 text-left last:border-b-0 hover:bg-surface"
    >
      <div className="relative shrink-0">
        <div
          style={{ background: avatarGradient(item.actorAvatarColor) }}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-on-accent"
        >
          {(item.actorHandle?.trim()[0] || "P").toUpperCase()}
        </div>
        <span
          aria-hidden="true"
          style={{ background: meta.bg }}
          className="absolute -right-1 -bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-surface-2 text-[10px]"
        >
          {meta.icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-text-muted">
          {item.unread && <span className="sr-only">Unread: </span>}
          <b className="text-text">@{item.actorHandle ?? "playm8z"}</b> {item.text}
        </p>
        <span className="font-mono text-[10px] text-text-dim">{relativeAge(item.createdAt)}</span>
      </div>
      {item.unread && <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-2" />}
    </button>
  );
}

// FR-002/FR-003/FR-004: client-side filtering over the user's own
// bounded notification feed (same reasoning as Inbox's conversation
// list -- a single-user, non-indefinitely-growing list doesn't need
// server-side/URL-driven filtering).
export function NotificationsList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [markingAll, setMarkingAll] = useState(false);

  const groups = filterAndGroupNotifications(items, filter);
  const unreadCount = items.filter((item) => item.unread).length;
  const hasItems = groups.length > 0;

  async function handleMarkAll() {
    setMarkingAll(true);
    await markAllRead();
    setMarkingAll(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-180 px-6 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text">Notifications</h1>
          <p className="text-sm text-text-muted">{unreadCount} unread</p>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={markingAll || unreadCount === 0}
          className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm font-bold text-text disabled:opacity-60"
        >
          Mark all read
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter notifications">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            aria-pressed={filter === option.key}
            className={
              filter === option.key
                ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3.5 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                : "rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 font-mono text-[11px] font-bold text-text"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {hasItems ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2.5 font-mono text-[10px] tracking-wider text-text-dim uppercase">{group.label}</div>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
                {group.items.map((item) =>
                  item.kind === "request" ? (
                    <RequestRow key={item.id} item={item} />
                  ) : (
                    <PlainRow key={item.id} item={item} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-18 text-center">
          <div className="mb-2.5 text-3xl">🔔</div>
          <div className="mb-1.5 text-lg font-bold text-text">You&apos;re all caught up</div>
          <p className="text-sm text-text-muted">Nothing new in this filter.</p>
        </div>
      )}
    </div>
  );
}
