"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { follows } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { toggleFollowSchema, type ToggleFollowInput } from "@/lib/validations/public-profile";

export type ToggleFollowResult = { success: true; following: boolean } | { success: false; error: string };

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code;
  return code === UNIQUE_VIOLATION;
}

// FR-004/research.md #4: unfollow is a real row delete (no trust/
// safety history value, same exception already applied to
// SavedListing/Likes/ThreadSubscription) -- re-following creates a
// new row. The `(followerId, followeeId)` unique constraint is the
// real duplicate-prevention mechanism (Forum Thread's own toggleLike
// precedent); a raced double-follow degrades to a harmless "already
// following" success rather than an error.
export async function toggleFollow(input: ToggleFollowInput): Promise<ToggleFollowResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to follow this player." };
  }

  const parsed = toggleFollowSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { followeeId } = parsed.data;

  if (followeeId === user.id) {
    return { success: false, error: "You can't follow yourself." };
  }

  const [existing] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followeeId, followeeId)));

  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
    return { success: true, following: false };
  }

  try {
    await db.insert(follows).values({ followerId: user.id, followeeId });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: true, following: true };
    }
    throw err;
  }

  return { success: true, following: true };
}
