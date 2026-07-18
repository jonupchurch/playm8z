"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { applications, postings } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { notifyRequestResolved } from "@/lib/notifications/notify-events";
import { requestActionSchema } from "@/lib/validations/inbox";

export type DeclineRequestResult = { success: true } | { success: false; error: string };

// FR-007: sets status to `declined` with no change to the posting's
// seatsOpen and no Conversation created -- the applicant's own
// message remains the only record of the request (ADR 0005, no hard
// delete). Only the posting's own host may decline, re-checked
// server-side via a join, not trusted from client state. Public
// Profile (022) amends this: for a host-initiated invite
// (`initiatedBy = 'host'`), the authorized actor is the INVITED
// applicant instead, mirroring accept-request.ts's own reversal.
export async function declineRequest(input: { applicationId: string }): Promise<DeclineRequestResult> {
  let actingUser: { id: string };
  try {
    actingUser = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const parsed = requestActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [application] = await db
    .select({
      id: applications.id,
      postingId: applications.postingId,
      applicantId: applications.applicantId,
      status: applications.status,
      initiatedBy: applications.initiatedBy,
    })
    .from(applications)
    .where(eq(applications.id, parsed.data.applicationId));

  if (!application || application.status !== "pending") {
    return { success: false, error: "This request is no longer pending." };
  }

  const [posting] = await db
    .select({ hostId: postings.hostId, game: postings.game, title: postings.title })
    .from(postings)
    .where(eq(postings.id, application.postingId));

  const authorized =
    application.initiatedBy === "host" ? application.applicantId === actingUser.id : posting?.hostId === actingUser.id;
  if (!posting || !authorized) {
    return { success: false, error: "You can't decline this request." };
  }

  await db
    .update(applications)
    .set({ status: "declined" })
    .where(and(eq(applications.id, application.id), eq(applications.status, "pending")));

  // Best-effort (040): tell the applicant their request was declined — today
  // this is the ONLY signal they get (decline creates no conversation). Only
  // the applicant-initiated flow; a host-initiated invite declined by the
  // applicant is the host's own synthesized view (research.md #3).
  if (application.initiatedBy !== "host") {
    await notifyRequestResolved({
      kind: "declined",
      applicantId: application.applicantId,
      hostId: posting.hostId,
      postingId: application.postingId,
      game: posting.game,
      title: posting.title,
    });
  }

  // The client navigates back to /inbox right after this resolves --
  // revalidating server-side (rather than the client calling
  // router.refresh() after router.push()) avoids a real observed race
  // where a client-side refresh() issued immediately after push() can
  // win and revert the navigation back to the old URL.
  revalidatePath("/inbox", "layout");
  return { success: true };
}
