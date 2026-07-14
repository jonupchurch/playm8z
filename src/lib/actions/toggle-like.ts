"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, likes } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { toggleLikeSchema, type ToggleLikeInput } from "@/lib/validations/forum-thread";

export type ToggleLikeResult = { success: true; liked: boolean } | { success: false; error: string };

const UNIQUE_VIOLATION = "23505";

// Fixed 2026-07-13 (News feed/013's session): Drizzle wraps the raw
// postgres.js error in a `DrizzleQueryError`, whose own `code` property
// is undefined -- the real Postgres error code lives one level down,
// at `err.cause.code`. This helper's original `"code" in err` check
// never actually matched a real thrown error (confirmed by inspecting
// one directly), so this catch branch had silently never worked --
// harmless here only because the SELECT-then-insert/delete flow above
// makes it unreachable outside a genuine race.
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code;
  return code === UNIQUE_VIOLATION;
}

async function adjustDenormalizedCount(targetType: "thread" | "reply", targetId: string, delta: 1 | -1) {
  if (targetType === "thread") {
    await db
      .update(forumThreads)
      .set({ likes: sql`${forumThreads.likes} + ${delta}` })
      .where(eq(forumThreads.id, targetId));
  } else {
    await db
      .update(forumReplies)
      .set({ likes: sql`${forumReplies.likes} + ${delta}` })
      .where(eq(forumReplies.id, targetId));
  }
}

// FR-008: like/unlike exactly once per user per target. The database's
// own unique constraint on (userId, targetType, targetId) is the real
// enforcement point (research.md #2) -- catching its violation here
// means a rapid double-request can't double-count even though the
// existence check below could itself be raced.
export async function toggleLike(input: ToggleLikeInput): Promise<ToggleLikeResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to like this." };
  }

  const parsed = toggleLikeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { targetType, targetId } = parsed.data;

  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, user.id), eq(likes.targetType, targetType), eq(likes.targetId, targetId)));

  if (existing) {
    await db.delete(likes).where(eq(likes.id, existing.id));
    await adjustDenormalizedCount(targetType, targetId, -1);
    return { success: true, liked: false };
  }

  try {
    await db.insert(likes).values({ userId: user.id, targetType, targetId });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: true, liked: true };
    }
    throw err;
  }

  await adjustDenormalizedCount(targetType, targetId, 1);
  return { success: true, liked: true };
}
