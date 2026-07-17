"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { getSettings } from "@/lib/settings/get-settings";
import { postingSchema, type PostingInput } from "@/lib/validations/posting";

export type ManagePostingResult = { success: true } | { success: false; error: string };

// FR-008: reuses Post a Game's own validation schema (research.md #5)
// rather than redefining title/description/etc. bounds a second time.
// Blocked once any application on the posting has been accepted --
// re-checked here server-side, never trusting the UI's own
// Edit-button visibility as the real guard.
export async function editPosting(postingId: string, input: PostingInput): Promise<ManagePostingResult> {
  const user = await requireAuth();

  // `genre` rides along on the ownership check -- no extra query -- so
  // the tolerance rule below can compare against what's already stored.
  const [posting] = await db
    .select({ hostId: postings.hostId, genre: postings.genre })
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

  // 030 FR-008, deliberately more tolerant than create-posting.ts:
  // accept the genre this posting ALREADY stores even if an admin has
  // since retired it from the list, and reject any other unlisted one.
  // Applying create's strict rule here would strand every host whose
  // genre got retired -- they could never edit their own posting's
  // title again without also being forced to relabel its genre
  // (research.md #4). Strict for values arriving, tolerant of the value
  // already there.
  const genre = parsed.data.genre;
  if (genre && genre !== posting.genre) {
    const { genres } = await getSettings();
    if (!genres.includes(genre)) {
      return { success: false, error: "That genre isn't available any more. Pick one from the list." };
    }
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
