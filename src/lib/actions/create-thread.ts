"use server";

import { db } from "@/db";
import { forumThreads } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { createThreadSchema, type CreateThreadInput } from "@/lib/validations/forum";

export type CreateThreadResult = { success: true; id: string } | { success: false; error: string };

// FR-008/FR-009: only ever inserts a thread with default pinned/locked
// (false) and zeroed counts -- this feature never sets the
// moderator-controlled fields, and reply/view/like counts are
// maintained by the future Forum Thread feature, not this one.
export async function createThread(input: CreateThreadInput): Promise<CreateThreadResult> {
  let author: { id: string };
  try {
    author = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to start a thread." };
  }

  const parsed = createThreadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [row] = await db
    .insert(forumThreads)
    .values({ authorId: author.id, ...parsed.data })
    .returning({ id: forumThreads.id });

  return { success: true, id: row.id };
}
