"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { computeAutoFlagReason } from "@/lib/moderation/auto-flag-rules";
import { postingSchema, type PostingInput } from "@/lib/validations/posting";

export type CreatePostingResult =
  | { success: true; id: string }
  | { success: false; error: string };

// FR-015/FR-017: the first real consumer of Auth & Onboarding's
// unverified-email write gate (research.md #4) -- checked before
// validation so an unverified user sees FR-017's message regardless of
// what they typed, and re-validates every field server-side (research.md
// #5), never trusting the form's own stepper clamping alone.
export async function createPosting(input: PostingInput): Promise<CreatePostingResult> {
  let host: { id: string };
  try {
    host = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to publish a listing." };
  }

  const parsed = postingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Admin Postings (017)/FR-012: a fixed, deterministic check at
  // creation time -- not retroactively applied to postings created
  // before this feature shipped.
  const [[hostRow], [{ n: existingPostingCount }]] = await Promise.all([
    db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, host.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(postings).where(eq(postings.hostId, host.id)),
  ]);
  const accountAgeDays = (Date.now() - hostRow.createdAt.getTime()) / 86_400_000;
  const autoFlagReason = computeAutoFlagReason(
    `${parsed.data.title} ${parsed.data.blurb}`,
    accountAgeDays,
    existingPostingCount === 0,
  );

  const [row] = await db
    .insert(postings)
    .values({ hostId: host.id, ...parsed.data, status: "open", autoFlagReason })
    .returning({ id: postings.id });

  return { success: true, id: row.id };
}
