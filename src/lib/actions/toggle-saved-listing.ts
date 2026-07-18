"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedListings } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";

export type ToggleSavedResult = { success: true; saved: boolean } | { success: false; error: string };

const UNIQUE_VIOLATION = "23505";

// Drizzle wraps the raw postgres.js error in a `DrizzleQueryError`, whose
// own `code` is undefined -- the real code lives at `err.cause.code`.
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code;
  return code === UNIQUE_VIOLATION;
}

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

  // The composite PK on (userId, postingId) is the real duplicate guard:
  // a raced double-tap "Save" that both miss the SELECT above degrades to
  // an idempotent success instead of an uncaught DrizzleQueryError, the
  // same pattern every other toggle action (follow/like/subscription)
  // already uses.
  try {
    await db.insert(savedListings).values({ userId: user.id, postingId });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: true, saved: true };
    }
    throw err;
  }
  return { success: true, saved: true };
}
