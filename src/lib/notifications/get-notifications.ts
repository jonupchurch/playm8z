import { FALLBACK_HANDLE } from "@/lib/fallback-handle";
import { eq, ne, and } from "drizzle-orm";
import { db } from "@/db";
import { applications, notifications, postings, users } from "@/db/schema";
import type { NotificationType } from "./create-notification";
import type { NotificationItem, PlainNotificationItem, RequestNotificationItem } from "./filter-notifications";

export type { NotificationFilter, NotificationGroup, NotificationItem } from "./filter-notifications";

// FR-001/FR-002/FR-005: merges real `notifications` rows with pending/
// resolved join-request Applications on postings the user hosts,
// mirroring get-inbox-list.ts's own "merged list" pattern (research.md
// #1) -- unlike Inbox's request list (which only ever shows `pending`,
// since resolved ones become a real Conversation or simply vanish),
// this feed also keeps `accepted`/`declined` ones around so a resolved
// request can still show its resolved state (FR-005) rather than
// disappearing. `withdrawn` Applications are excluded entirely -- the
// host never took an action on those, so there's nothing to notify
// them about. Server-only (imports `db`) -- client components must
// import filter-notifications.ts instead, never this file.
export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      actorHandle: users.handle,
      actorAvatarColor: users.avatarColor,
      actorAvatarImage: users.avatarImage,
      actorImage: users.image,
      text: notifications.text,
      targetRef: notifications.targetRef,
      read: notifications.read,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, userId));

  const notificationItems: PlainNotificationItem[] = rows.map((row) => ({
    kind: "notification",
    id: row.id,
    type: row.type as NotificationType,
    actorHandle: row.actorHandle,
    actorAvatarColor: row.actorAvatarColor,
    actorAvatarImage: row.actorAvatarImage,
    actorImage: row.actorImage,
    text: row.text,
    targetRef: row.targetRef,
    unread: !row.read,
    createdAt: row.createdAt,
  }));

  const requestRows = await db
    .select({
      applicationId: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      postingId: postings.id,
      postingTitle: postings.title,
      postingGame: postings.game,
      applicantHandle: users.handle,
      applicantAvatarColor: users.avatarColor,
      applicantAvatarImage: users.avatarImage,
      applicantImage: users.image,
    })
    .from(applications)
    .innerJoin(postings, eq(applications.postingId, postings.id))
    .innerJoin(users, eq(applications.applicantId, users.id))
    .where(and(eq(postings.hostId, userId), ne(applications.status, "withdrawn")));

  const requestItems: RequestNotificationItem[] = requestRows.map((row) => {
    const status = row.status as "pending" | "accepted" | "declined";
    const actorHandle = row.applicantHandle ?? FALLBACK_HANDLE;
    return {
      kind: "request",
      id: row.applicationId,
      status,
      actorHandle,
      actorAvatarColor: row.applicantAvatarColor,
      actorAvatarImage: row.applicantAvatarImage,
      actorImage: row.applicantImage,
      context: `${row.postingGame} · ${row.postingTitle}`,
      resolvedText:
        status === "accepted"
          ? `✓ You added @${actorHandle} to your party`
          : status === "declined"
            ? "Request declined"
            : null,
      targetRef: `/listing/${row.postingId}`,
      unread: status === "pending",
      createdAt: row.createdAt,
    };
  });

  return [...notificationItems, ...requestItems];
}
