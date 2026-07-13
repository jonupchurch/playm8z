"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { postingSchema, type PostingInput } from "@/lib/validations/posting";

export type ManagePostingResult = { success: true } | { success: false; error: string };

// FR-008: reuses Post a Game's own validation schema (research.md #5)
// rather than redefining title/description/etc. bounds a second time.
// Blocked once any application on the posting has been accepted --
// re-checked here server-side, never trusting the UI's own
// Edit-button visibility as the real guard.
export async function editPosting(postingId: string, input: PostingInput): Promise<ManagePostingResult> {
  const user = await requireAuth();

  const [posting] = await db
    .select({ hostId: postings.hostId })
    .from(postings)
    .where(eq(postings.id, postingId));
  if (!posting || posting.hostId !== user.id) {
    return { success: false, error: "That posting wasn't found." };
  }

  const [accepted] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.postingId, postingId), eq(applications.status, "accepted")));
  if (accepted) {
    return { success: false, error: "This posting can't be edited once an applicant has been accepted." };
  }

  const parsed = postingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.update(postings).set(parsed.data).where(eq(postings.id, postingId));

  return { success: true };
}

// FR-009: manual status toggle -- Close from any not-yet-closed
// status; Reopen always returns to `open` (a posting doesn't
// re-derive `full` here, matching the plain toggle the wireframe
// depicts).
export async function closePosting(postingId: string): Promise<ManagePostingResult> {
  const user = await requireAuth();

  const result = await db
    .update(postings)
    .set({ status: "closed" })
    .where(and(eq(postings.id, postingId), eq(postings.hostId, user.id)))
    .returning({ id: postings.id });

  if (result.length === 0) {
    return { success: false, error: "That posting wasn't found." };
  }
  return { success: true };
}

export async function reopenPosting(postingId: string): Promise<ManagePostingResult> {
  const user = await requireAuth();

  const result = await db
    .update(postings)
    .set({ status: "open" })
    .where(and(eq(postings.id, postingId), eq(postings.hostId, user.id)))
    .returning({ id: postings.id });

  if (result.length === 0) {
    return { success: false, error: "That posting wasn't found." };
  }
  return { success: true };
}
