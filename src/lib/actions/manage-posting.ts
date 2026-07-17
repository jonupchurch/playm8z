"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { getSettings } from "@/lib/settings/get-settings";
import { POSTING_AGE_GROUPS } from "@/lib/postings/age-label";
import { postingSchema, type PostingInput } from "@/lib/validations/posting";

export type ManagePostingResult = { success: true } | { success: false; error: string };

// FR-008: reuses Post a Game's own validation schema (research.md #5)
// rather than redefining title/description/etc. bounds a second time.
// Blocked once any application on the posting has been accepted --
// re-checked here server-side, never trusting the UI's own
// Edit-button visibility as the real guard.
export async function editPosting(postingId: string, input: PostingInput): Promise<ManagePostingResult> {
  const user = await requireAuth();

  // `genre`/`ageGroup` ride along on the ownership check -- no extra
  // query -- so the tolerance rules below can compare against what's
  // already stored.
  const [posting] = await db
    .select({ hostId: postings.hostId, genre: postings.genre, ageGroup: postings.ageGroup })
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

  // 032/ADR 0009: strict for values arriving, tolerant of the value
  // already stored. A posting created before 0009 holds "18"/"21", which
  // postingSchema deliberately no longer accepts -- but its host must
  // still be able to fix a typo in the title without being forced to
  // relabel who their party is for (FR-011, US3 scenario 5).
  //
  // The stored value is swapped for a valid placeholder purely so the
  // REST of the payload can be parsed, then put back before the write.
  // This never widens what a host can set: it applies only to the exact
  // value this row already holds, and only when resubmitted unchanged.
  // Switching TO a retired value still fails, because then
  // `input.ageGroup !== posting.ageGroup`.
  const keepsStoredLegacyAge =
    input.ageGroup === posting.ageGroup &&
    !(POSTING_AGE_GROUPS as readonly string[]).includes(posting.ageGroup);

  const parsed = postingSchema.safeParse(keepsStoredLegacyAge ? { ...input, ageGroup: "any" } : input);
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

  // Put the stored legacy age back, so the row is not relabelled by the
  // placeholder the parse needed.
  const values = keepsStoredLegacyAge ? { ...parsed.data, ageGroup: posting.ageGroup } : parsed.data;
  await db.update(postings).set(values).where(eq(postings.id, postingId));

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
