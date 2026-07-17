import Link from "next/link";

// The top-nav Messages entry (037): the first-class, one-click path into
// the inbox, beside the notification bell. Unlike NotificationBell (a
// disclosure widget with a preview dropdown, hence a client component),
// this has no interactivity -- it just navigates -- so it stays a plain
// server-rendered Link and ships no client JS. The badge markup, the
// `99+` cap, and the count-bearing aria-label deliberately mirror
// NotificationBell so the two nav badges read as a matched pair.
export function MessagesLink({ unreadCount }: { unreadCount: number }) {
  const hasUnread = unreadCount > 0;
  return (
    <Link
      href="/inbox"
      aria-label={hasUnread ? `Messages, ${unreadCount} unread` : "Messages"}
      className="relative flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-border bg-surface-2 text-base"
    >
      <span aria-hidden="true">✉️</span>
      {hasUnread && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-bg bg-pop px-1 font-mono text-[10px] font-bold text-white"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
