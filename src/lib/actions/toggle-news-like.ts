"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { likes } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { newsArticleTargetSchema, type NewsArticleTargetInput } from "@/lib/validations/news-article";

export type ToggleNewsLikeResult = { success: true; liked: boolean } | { success: false; error: string };

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code;
  return code === UNIQUE_VIOLATION;
}

// FR-005/research.md #4: this feature's third consumer of Forum
// Thread's (010) already-polymorphic `likes` table -- `targetType =
// 'newsPost'`, no schema change needed. The `(userId, targetType,
// targetId)` unique constraint is the real duplicate-prevention
// mechanism (same reasoning as toggle-like.ts's own), not an
// application-level check alone.
export async function toggleNewsLike(input: NewsArticleTargetInput): Promise<ToggleNewsLikeResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to like this." };
  }

  const parsed = newsArticleTargetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { newsPostId } = parsed.data;

  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, user.id), eq(likes.targetType, "newsPost"), eq(likes.targetId, newsPostId)));

  if (existing) {
    await db.delete(likes).where(eq(likes.id, existing.id));
    return { success: true, liked: false };
  }

  try {
    await db.insert(likes).values({ userId: user.id, targetType: "newsPost", targetId: newsPostId });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: true, liked: true };
    }
    throw err;
  }

  return { success: true, liked: true };
}
