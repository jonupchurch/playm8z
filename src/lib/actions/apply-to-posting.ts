"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { refuseIfBlocked } from "@/lib/inbox/block-guard";
import { applyMessageSchema } from "@/lib/validations/listing-detail";

export type ApplyResult = { success: true } | { success: false; error: string };

// FR-005/FR-009: rejects the listing's own host and a listing with no
// remaining open spots. Submitting an application never touches
// seatsOpen -- only an accepted transition (Inbox/messaging's job, out
// of this feature's scope) changes what the roster shows as filled
// (research.md #4).
export async function applyToPosting(
  postingId: string,
  input: { message?: string },
): Promise<ApplyResult> {
  let applicant: { id: string };
  try {
    applicant = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const parsed = applyMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [posting] = await db
    .select({ hostId: postings.hostId, seatsOpen: postings.seatsOpen })
    .from(postings)
    .where(eq(postings.id, postingId));

  if (!posting) {
    return { success: false, error: "This listing no longer exists." };
  }
  if (posting.hostId === applicant.id) {
    return { success: false, error: "You can't apply to your own listing." };
  }
  if (posting.seatsOpen <= 0) {
    return { success: false, error: "This listing has no open spots." };
  }

  // 045 (ADR 0017): a block in either direction between the applicant and host
  // refuses the application (fail-closed, neutral message).
  const refusal = await refuseIfBlocked(applicant.id, posting.hostId, "You can't apply to this listing.");
  if (refusal) return refusal;

  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.postingId, postingId),
        eq(applications.applicantId, applicant.id),
        inArray(applications.status, ["pending", "accepted"]),
      ),
    );

  if (existing) {
    return { success: false, error: "You already have an active application to this listing." };
  }

  await db.insert(applications).values({
    postingId,
    applicantId: applicant.id,
    message: parsed.data.message,
  });

  return { success: true };
}
