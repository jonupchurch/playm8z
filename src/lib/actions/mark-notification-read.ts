"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { markNotificationReadSchema } from "@/lib/validations/notifications";

export type MarkNotificationReadResult = { success: true } | { success: false; error: string };

// FR-003: scoped to the acting user's own row (WHERE userId=...) so one
// user can't mark another's notification read by guessing an id.
// `read` only ever transitions false -> true here (data-model.md).
export async function markNotificationRead(input: { notificationId: string }): Promise<MarkNotificationReadResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const parsed = markNotificationReadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, parsed.data.notificationId), eq(notifications.userId, user.id)));

  // The root layout's SiteHeader (bell) computes its unread count on
  // every render -- revalidating it here (rather than relying on a
  // client router.refresh()) keeps it accurate on the very next
  // navigation, the same server-side-revalidation pattern established
  // by Inbox's accept/decline actions.
  revalidatePath("/", "layout");
  return { success: true };
}
