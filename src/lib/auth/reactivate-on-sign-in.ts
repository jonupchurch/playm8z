import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Profile + Account settings (007), research.md #3: clears
 * deactivatedAt for a user completing a successful sign-in -- a
 * deactivated account reactivates automatically, no separate "undo"
 * step. A no-op UPDATE when already null. Called from src/auth.ts's
 * signIn callback, extracted here so the logic is testable without
 * exercising NextAuth's own machinery.
 */
export async function reactivateOnSignIn(userId: string): Promise<void> {
  await db.update(users).set({ deactivatedAt: null }).where(eq(users.id, userId));
}
