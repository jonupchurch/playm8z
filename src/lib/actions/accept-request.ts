"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { applications, conversations, messages, postings, users } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { notifyRequestResolved } from "@/lib/notifications/notify-events";
import { requestActionSchema } from "@/lib/validations/inbox";

export type AcceptRequestResult = { success: true; conversationId: string } | { success: false; error: string };

// FR-007: only the posting's own host may accept, re-checked
// server-side, never trusted from client state. Public Profile (022)
// amends this: for a host-initiated invite (`initiatedBy = 'host'`,
// invite-to-party.ts), the authorized actor is the INVITED applicant
// instead -- an invite still needs the invited person's own consent,
// reversed from every normal applicant-initiated row. Application
// status, the posting's seatsOpen/status, and the new Conversation all
// change together inside one transaction (research.md #3) -- a partial
// failure here would silently corrupt the posting's capacity
// accounting, which Principle V calls out as exactly the kind of seam
// that needs this guarantee.
export async function acceptRequest(input: { applicationId: string }): Promise<AcceptRequestResult> {
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

  try {
    const result = await db.transaction(async (tx) => {
      const [application] = await tx
        .select({
          id: applications.id,
          applicantId: applications.applicantId,
          status: applications.status,
          postingId: applications.postingId,
          initiatedBy: applications.initiatedBy,
        })
        .from(applications)
        .where(eq(applications.id, parsed.data.applicationId));

      if (!application || application.status !== "pending") {
        throw new Error("This request is no longer pending.");
      }

      const [posting] = await tx
        .select({
          id: postings.id,
          hostId: postings.hostId,
          seatsOpen: postings.seatsOpen,
          game: postings.game,
          title: postings.title,
        })
        .from(postings)
        .where(eq(postings.id, application.postingId));

      const authorized =
        application.initiatedBy === "host"
          ? application.applicantId === actingUser.id
          : posting?.hostId === actingUser.id;
      if (!posting || !authorized) {
        throw new Error("You can't accept this request.");
      }

      // Guarded update, checked via .returning() -- if a concurrent
      // accept already won (the WHERE status='pending' no longer
      // matches once the other transaction commits), this affects zero
      // rows and the whole transaction rolls back rather than
      // double-decrementing seatsOpen or creating a second conversation.
      const updated = await tx
        .update(applications)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(and(eq(applications.id, application.id), eq(applications.status, "pending")))
        .returning({ id: applications.id });

      if (updated.length === 0) {
        throw new Error("This request is no longer pending.");
      }

      const nextSeatsOpen = Math.max(0, posting.seatsOpen - 1);
      await tx
        .update(postings)
        .set({ seatsOpen: nextSeatsOpen, status: nextSeatsOpen === 0 ? "full" : undefined })
        .where(eq(postings.id, posting.id));

      const [applicant] = await tx
        .select({ handle: users.handle })
        .from(users)
        .where(eq(users.id, application.applicantId));

      const [conversation] = await tx
        .insert(conversations)
        .values({ memberIds: [posting.hostId, application.applicantId] })
        .returning({ id: conversations.id });

      await tx.insert(messages).values({
        conversationId: conversation.id,
        senderId: null,
        type: "system",
        body:
          application.initiatedBy === "host"
            ? `@${applicant?.handle ?? "player"} accepted the invite and joined the party.`
            : `You accepted — @${applicant?.handle ?? "player"} joined the party.`,
      });

      return {
        conversationId: conversation.id,
        postingId: posting.id,
        applicantId: application.applicantId,
        hostId: posting.hostId,
        initiatedBy: application.initiatedBy,
        game: posting.game,
        title: posting.title,
      };
    });

    // The client navigates to the new conversation right after this
    // resolves -- revalidating server-side (rather than the client
    // calling router.refresh() after router.push()) avoids a real
    // observed race where a client-side refresh() issued immediately
    // after push() can win and revert the navigation back to the old URL.
    // The listing's roster (006-listing-detail) also needs to reflect
    // the newly-accepted member.
    revalidatePath("/inbox", "layout");
    revalidatePath(`/listing/${result.postingId}`, "page");

    // Best-effort (040), strictly AFTER the transaction so a notification
    // failure can never roll back the seat/conversation accounting. Only the
    // applicant-initiated flow notifies the applicant; a host-initiated invite
    // being accepted by that applicant is covered by the host's live request
    // synthesis instead (research.md #3).
    if (result.initiatedBy !== "host") {
      await notifyRequestResolved({
        kind: "accepted",
        applicantId: result.applicantId,
        hostId: result.hostId,
        postingId: result.postingId,
        game: result.game,
        title: result.title,
      });
    }

    return { success: true, conversationId: result.conversationId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Couldn't accept this request." };
  }
}
