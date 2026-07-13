"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { threadSubscriptions } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { toggleSubscriptionSchema, type ToggleSubscriptionInput } from "@/lib/validations/forum-thread";

export type ToggleSubscriptionResult = { success: true; subscribed: boolean } | { success: false; error: string };

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === UNIQUE_VIOLATION;
}

// FR-010: stores a per-user thread-subscription preference only --
// this feature never sends a notification as a result (research.md
// #5). Same toggle-race safety as toggle-like.ts, via the table's own
// unique constraint on (userId, threadId).
export async function toggleSubscription(input: ToggleSubscriptionInput): Promise<ToggleSubscriptionResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to subscribe." };
  }

  const parsed = toggleSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { threadId } = parsed.data;

  const [existing] = await db
    .select({ id: threadSubscriptions.id })
    .from(threadSubscriptions)
    .where(and(eq(threadSubscriptions.userId, user.id), eq(threadSubscriptions.threadId, threadId)));

  if (existing) {
    await db.delete(threadSubscriptions).where(eq(threadSubscriptions.id, existing.id));
    return { success: true, subscribed: false };
  }

  try {
    await db.insert(threadSubscriptions).values({ userId: user.id, threadId });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: true, subscribed: true };
    }
    throw err;
  }

  return { success: true, subscribed: true };
}
