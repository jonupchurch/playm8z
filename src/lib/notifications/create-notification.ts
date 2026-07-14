import { db } from "@/db";
import { notifications } from "@/db/schema";

// guidelines.md's documented shape. 'join'/'accepted' are never
// inserted by this helper in practice -- real party-request activity
// is synthesized live from `applications` instead (get-notifications.ts,
// research.md #1) -- but the type stays in the enum for whichever
// future feature amendment does call this helper for them.
export type NotificationType =
  | "join"
  | "accepted"
  | "reply"
  | "mention"
  | "message"
  | "rating"
  | "news"
  | "system";

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  actorId?: string | null;
  text: string;
  targetRef: string;
};

// FR-009: the reusable mechanism other features' write actions call to
// generate a notification. No callers are wired up by this feature
// itself (spec.md's Assumptions, research.md #1) -- each already-
// existing write action's own retrofit is tracked in
// docs/future-work.md. Demonstrated here only against seeded/test data.
export async function createNotification(input: CreateNotificationInput): Promise<{ id: string }> {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      actorId: input.actorId ?? null,
      text: input.text,
      targetRef: input.targetRef,
    })
    .returning({ id: notifications.id });

  return row;
}
