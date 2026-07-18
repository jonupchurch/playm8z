"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { refuseIfBlocked } from "@/lib/inbox/block-guard";
import { inviteToPartySchema, type InviteToPartyInput } from "@/lib/validations/public-profile";

export type InviteToPartyResult = { success: true } | { success: false; error: string };

// FR-006/research.md #3: a host-initiated Application row
// (`initiatedBy = 'host'`), otherwise identical to a normal applicant-
// initiated one -- still `pending`, still requires the INVITED user's
// own accept/decline decision (accept-request.ts's/decline-request.ts's
// amended ownership check), never auto-accepted. Re-verifies server-
// side that the acting user actually hosts `postingId` and it has an
// open seat, rather than trusting the UI to only offer eligible
// postings.
export async function inviteToParty(input: InviteToPartyInput): Promise<InviteToPartyResult> {
  let host: { id: string };
  try {
    host = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to invite someone to a party." };
  }

  const parsed = inviteToPartySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { postingId, invitedUserId } = parsed.data;

  if (invitedUserId === host.id) {
    return { success: false, error: "You can't invite yourself." };
  }

  const [posting] = await db
    .select({ hostId: postings.hostId, status: postings.status, seatsOpen: postings.seatsOpen })
    .from(postings)
    .where(eq(postings.id, postingId));

  if (!posting) {
    return { success: false, error: "This party no longer exists." };
  }
  if (posting.hostId !== host.id) {
    return { success: false, error: "You can only invite people to a party you host." };
  }
  if (posting.status !== "open" || posting.seatsOpen <= 0) {
    return { success: false, error: "This party has no open spots right now." };
  }

  // 045 (ADR 0017): a block in either direction between host and invited player
  // refuses the invite (fail-closed, neutral message).
  const refusal = await refuseIfBlocked(host.id, invitedUserId, "You can't invite this player.");
  if (refusal) return refusal;

  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.postingId, postingId),
        eq(applications.applicantId, invitedUserId),
        inArray(applications.status, ["pending", "accepted"]),
      ),
    );
  if (existing) {
    return { success: false, error: "This player already has an active application to this party." };
  }

  // 046 (ADR 0018): conflict-safe -- the select-check is the friendly fast path, the
  // partial unique index the race-proof backstop. A lost race inserts nothing and
  // surfaces the same rejection, never a raw error.
  const inserted = await db
    .insert(applications)
    .values({ postingId, applicantId: invitedUserId, status: "pending", initiatedBy: "host" })
    .onConflictDoNothing()
    .returning({ id: applications.id });

  if (inserted.length === 0) {
    return { success: false, error: "This player already has an active application to this party." };
  }

  return { success: true };
}
