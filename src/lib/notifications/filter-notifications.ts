import type { NotificationType } from "./create-notification";

// Split out of get-notifications.ts (which also holds the DB-touching
// getNotifications()) so client components can import the pure
// filter/group logic and its types without pulling `db`/`postgres`
// (Node-only) into the browser bundle -- importing any runtime value
// from a module that also imports `@/db` bundles the whole module,
// unlike a type-only import (which Inbox's own conversation-list.tsx
// gets away with for InboxItem).

export type NotificationFilter = "all" | "unread" | "requests" | "forum" | "system";

export type RequestNotificationItem = {
  kind: "request";
  id: string; // applications.id
  status: "pending" | "accepted" | "declined";
  actorHandle: string;
  actorAvatarColor: string | null;
  actorAvatarImage: string | null;
  actorImage: string | null;
  context: string;
  resolvedText: string | null;
  targetRef: string;
  unread: boolean;
  createdAt: Date;
};

export type PlainNotificationItem = {
  kind: "notification";
  id: string; // notifications.id
  type: NotificationType;
  actorHandle: string | null;
  actorAvatarColor: string | null;
  actorAvatarImage: string | null;
  actorImage: string | null;
  text: string;
  targetRef: string;
  unread: boolean;
  createdAt: Date;
};

export type NotificationItem = RequestNotificationItem | PlainNotificationItem;

export type NotificationGroup = { label: "Today" | "Earlier"; items: NotificationItem[] };

// FR-002: 'join'/'accepted' are categorized as "requests"; 'reply'/
// 'mention' as "forum"; 'rating'/'news'/'system' as "system". 'message'
// has no dedicated filter chip (the wireframe's own filter set only
// covers All/Unread/Requests/Forum/System) -- it only ever surfaces
// under All or Unread.
function categoryOf(item: NotificationItem): "requests" | "forum" | "system" | null {
  if (item.kind === "request") return "requests";
  switch (item.type) {
    case "accepted":
      return "requests";
    case "reply":
    case "mention":
      return "forum";
    case "rating":
    case "news":
    case "system":
      return "system";
    default:
      return null;
  }
}

// FR-002/FR-004: pure, DB-free filter + Today/Earlier grouping so it's
// unit-testable without a database. Sorted newest-first before being
// split into groups.
export function filterAndGroupNotifications(
  items: NotificationItem[],
  filter: NotificationFilter,
): NotificationGroup[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const matches = items
    .filter((item) => {
      if (filter === "all") return true;
      if (filter === "unread") return item.unread;
      return categoryOf(item) === filter;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const today = matches.filter((item) => item.createdAt >= startOfToday);
  const earlier = matches.filter((item) => item.createdAt < startOfToday);

  const groups: NotificationGroup[] = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (earlier.length) groups.push({ label: "Earlier", items: earlier });
  return groups;
}
