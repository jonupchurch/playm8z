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
import { NavLinks } from "@/components/nav/nav-links";
import { ProfileMenu } from "@/components/nav/profile-menu";
import { SiteHeaderFrame } from "@/components/nav/site-header-frame";
import { getSettings } from "@/lib/settings/get-settings";

// The real global nav, finally built directly (Design System
// infrastructure, exempt from the per-feature spec gate) after 14
// features in a row each deferred it and rendered nothing but a bare
// logo + bell -- every page built so far (Browse, Forum, News,
// Listing detail, Content pages, ...) was already live and reachable
// by URL, just not discoverable through any actual nav.
export async function SiteHeader() {
  // proxy.ts's maintenance gate is a *rewrite* (the browser URL stays
  // whatever the visitor originally requested, e.g. "/browse"), so a
  // pathname-based check here could never detect it -- checking the
  // same flag directly is the only way that actually works, and it's
  // a cheap, already-cached read (get-settings.ts).
  const settings = await getSettings();
  if (settings.maintenanceMode) {
    return null;
  }

  const session = await auth();

  if (!session?.user?.email) {
    return (
      <SiteHeaderFrame>
        <Logo />
        <NavLinks />
        <div className="ml-auto flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-accent-2">
            Log in
          </Link>
          <Link href="/post" className="rounded-lg bg-accent px-3.5 py-2 text-sm font-bold text-on-accent">
            Post a game
          </Link>
        </div>
      </SiteHeaderFrame>
    );
  }

  const [user] = await db
    .select({ id: users.id, handle: users.handle, avatarColor: users.avatarColor })
    .from(users)
    .where(eq(users.email, session.user.email));
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
    <SiteHeaderFrame>
      <Logo />
      <NavLinks />
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/post"
          className="hidden rounded-lg bg-accent px-3.5 py-2 text-sm font-bold text-on-accent sm:block"
        >
          Post a game
        </Link>
        <NotificationBell unreadCount={unreadCount} preview={preview} />
        <ProfileMenu handle={user.handle ?? "player"} avatarColor={user.avatarColor} />
      </div>
    </SiteHeaderFrame>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <PawMark size={28} />
      <Wordmark className="text-lg" />
    </Link>
  );
}
