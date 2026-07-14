"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";

export type MarkAllReadResult = { success: true } | { success: false; error: string };

// FR-003: bulk-clears every unread indicator for the acting user's own
// real `notifications` rows. Deliberately doesn't touch pending
// Applications (get-notifications.ts's synthesized "request" items) --
// those stay "unread" (needing attention) until actually Accepted or
// Declined, the same simplification Inbox's own request list uses.
export async function markAllRead(): Promise<MarkAllReadResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

  revalidatePath("/", "layout");
  return { success: true };
}
