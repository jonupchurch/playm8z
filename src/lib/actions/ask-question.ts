"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, questions } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { refuseIfBlocked } from "@/lib/inbox/block-guard";
import { questionTextSchema } from "@/lib/validations/listing-detail";

export type AskResult = { success: true } | { success: false; error: string };

// FR-010: any verified visitor (host included -- nothing in the spec
// excludes the host from asking their own listing a question).
export async function askQuestion(
  postingId: string,
  input: { text: string },
): Promise<AskResult> {
  let asker: { id: string };
  try {
    asker = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const parsed = questionTextSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // 045 (ADR 0017): the host id is needed for the block check (and loading the
  // posting also guards against a question on a listing that no longer exists).
  const [posting] = await db.select({ hostId: postings.hostId }).from(postings).where(eq(postings.id, postingId));
  if (!posting) {
    return { success: false, error: "This listing no longer exists." };
  }

  // A block in either direction between asker and host refuses the question
  // (fail-closed, neutral). A host asking their own listing is a self pair, never blocked.
  const refusal = await refuseIfBlocked(asker.id, posting.hostId, "You can't ask a question on this listing.");
  if (refusal) return refusal;

  await db.insert(questions).values({ postingId, askerId: asker.id, text: parsed.data.text });

  return { success: true };
}
