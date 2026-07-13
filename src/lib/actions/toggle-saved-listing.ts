"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedListings } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";

export type ToggleSavedResult = { success: true; saved: boolean } | { success: false; error: string };

// FR-014/FR-018: gated the same as applying or asking. Unsaving is a
// real delete, not a status flag -- a bookmark carries no
// moderation/audit history worth preserving under ADR 0005's spirit
// (data-model.md). savedListings is owned by Profile (007); this
// feature is implemented first and is its first real consumer.
export async function toggleSavedListing(postingId: string): Promise<ToggleSavedResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const [existing] = await db
    .select({ userId: savedListings.userId })
    .from(savedListings)
    .where(and(eq(savedListings.userId, user.id), eq(savedListings.postingId, postingId)));

  if (existing) {
    await db
      .delete(savedListings)
      .where(and(eq(savedListings.userId, user.id), eq(savedListings.postingId, postingId)));
    return { success: true, saved: false };
  }

  await db.insert(savedListings).values({ userId: user.id, postingId });
  return { success: true, saved: true };
}
