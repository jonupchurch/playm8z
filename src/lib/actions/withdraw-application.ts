"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";

export type WithdrawResult = { success: true } | { success: false; error: string };

// FR-007: sets status to `withdrawn` (never hard-deleted, ADR 0005) --
// only the applicant themselves can withdraw their own application.
export async function withdrawApplication(applicationId: string): Promise<WithdrawResult> {
  let applicant: { id: string };
  try {
    applicant = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const result = await db
    .update(applications)
    .set({ status: "withdrawn" })
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.applicantId, applicant.id),
        eq(applications.status, "pending"),
      ),
    )
    .returning({ id: applications.id });

  if (result.length === 0) {
    return { success: false, error: "No withdrawable application was found." };
  }

  return { success: true };
}
