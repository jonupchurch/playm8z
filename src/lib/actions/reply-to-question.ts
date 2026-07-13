"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, questions } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { replyTextSchema } from "@/lib/validations/listing-detail";

export type ReplyResult = { success: true } | { success: false; error: string };

// FR-011: only the listing's own host may reply -- a per-resource
// ownership check (research.md #3), not a reusable role gate like
// require-role.ts, since "is this session the resource's own host" is
// specific to a single posting.
export async function replyToQuestion(
  questionId: string,
  input: { reply: string },
): Promise<ReplyResult> {
  let host: { id: string };
  try {
    host = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const parsed = replyTextSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [question] = await db
    .select({ postingId: questions.postingId, reply: questions.reply })
    .from(questions)
    .where(eq(questions.id, questionId));

  if (!question) {
    return { success: false, error: "This question no longer exists." };
  }
  if (question.reply) {
    return { success: false, error: "This question already has a reply." };
  }

  const [posting] = await db
    .select({ hostId: postings.hostId })
    .from(postings)
    .where(eq(postings.id, question.postingId));

  if (!posting || posting.hostId !== host.id) {
    return { success: false, error: "Only the listing's host can reply." };
  }

  await db
    .update(questions)
    .set({ reply: parsed.data.reply, repliedAt: new Date() })
    .where(eq(questions.id, questionId));

  return { success: true };
}
