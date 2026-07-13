"use server";

import { db } from "@/db";
import { questions } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
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

  await db.insert(questions).values({ postingId, askerId: asker.id, text: parsed.data.text });

  return { success: true };
}
