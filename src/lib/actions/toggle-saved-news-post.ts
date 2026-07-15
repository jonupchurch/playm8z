"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedNewsPosts } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { newsArticleTargetSchema, type NewsArticleTargetInput } from "@/lib/validations/news-article";

export type ToggleSavedNewsPostResult = { success: true; saved: boolean } | { success: false; error: string };

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code;
  return code === UNIQUE_VIOLATION;
}

// FR-005/FR-006/research.md #4/#5: a small, separate `savedNewsPosts`
// table -- deliberately NOT a generalization of `savedListings`
// (only the second real consumer, below this project's own
// "generalize at three" bar). Unsaving is a real delete (no trust/
// safety history value, same exception as `savedListings`/`likes`/
// `follows`). The `(userId, newsPostId)` unique constraint is the
// real duplicate-prevention mechanism.
export async function toggleSavedNewsPost(input: NewsArticleTargetInput): Promise<ToggleSavedNewsPostResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to save this." };
  }

  const parsed = newsArticleTargetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { newsPostId } = parsed.data;

  const [existing] = await db
    .select({ id: savedNewsPosts.id })
    .from(savedNewsPosts)
    .where(and(eq(savedNewsPosts.userId, user.id), eq(savedNewsPosts.newsPostId, newsPostId)));

  if (existing) {
    await db.delete(savedNewsPosts).where(eq(savedNewsPosts.id, existing.id));
    return { success: true, saved: false };
  }

  try {
    await db.insert(savedNewsPosts).values({ userId: user.id, newsPostId });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: true, saved: true };
    }
    throw err;
  }

  return { success: true, saved: true };
}
