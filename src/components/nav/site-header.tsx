import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getNotifications } from "@/lib/notifications/get-notifications";
import { filterAndGroupNotifications } from "@/lib/notifications/filter-notifications";
import { relativeAge } from "@/components/listings/listing-card";
import { PawMark } from "@/components/brand/paw-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { NotificationBell, type BellPreviewItem } from "@/components/nav/notification-bell";

// FR-001: the bell needs to be reachable from anywhere, but no shared
// nav shell exists yet anywhere in this codebase -- every prior
// feature explicitly deferred nav/footer as future Design System
// infrastructure and simply rendered none (spec.md's Assumptions, same
// wording as every feature before this one). This is the smallest
// slot that actually satisfies FR-001: a thin sticky bar with just the
// logo and the bell, no Browse/Groups/Forum links -- the real global
// nav remains deferred, unchanged. Renders nothing for an
// unauthenticated visitor (only /login-style pages hit that path,
// since every authenticated route already redirects otherwise).
export async function SiteHeader() {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, session.user.email));
  if (!user) {
    return null;
  }

  const items = await getNotifications(user.id);
  const unreadCount = items.filter((item) => item.unread).length;
  const unreadGroups = filterAndGroupNotifications(items, "unread");
  const preview: BellPreviewItem[] = unreadGroups
    .flatMap((group) => group.items)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      actorLabel: `@${item.actorHandle ?? "player"}`,
      text: item.kind === "request" ? "wants to join your party" : item.text,
      targetRef: item.targetRef,
      type: item.kind === "request" ? "join" : item.type,
      timeLabel: relativeAge(item.createdAt),
    }));

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-bg/85 px-6 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2.5">
        <PawMark size={28} />
        <Wordmark className="text-lg" />
      </Link>
      <div className="ml-auto flex items-center">
        <NotificationBell unreadCount={unreadCount} preview={preview} />
      </div>
    </header>
  );
}
