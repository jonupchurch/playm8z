"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";

export type DeactivateResult = { success: true } | { success: false; error: string };

// FR-013: hides the profile/postings from other visitors (get-open-
// postings.ts/search-postings.ts already exclude a deactivated host).
// Reactivation is automatic on the next successful sign-in
// (research.md #3, src/auth.ts's signIn callback) -- no separate
// "undo" action exists here.
export async function deactivateAccount(): Promise<DeactivateResult> {
  const user = await requireAuth();

  await db.update(users).set({ deactivatedAt: new Date() }).where(eq(users.id, user.id));

  return { success: true };
}
