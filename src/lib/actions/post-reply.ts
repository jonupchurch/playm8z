"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { postReplySchema, type PostReplyInput } from "@/lib/validations/forum-thread";

export type PostReplyResult = { success: true; id: string } | { success: false; error: string };

// FR-006/FR-007: posts a reply (optionally quoting another) and keeps
// the thread's own denormalized replyCount in sync -- this feature is
// forumReplies' only writer.
export async function postReply(input: PostReplyInput): Promise<PostReplyResult> {
  let author: { id: string };
  try {
    author = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to reply." };
  }

  const parsed = postReplySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [row] = await db
    .insert(forumReplies)
    .values({ authorId: author.id, ...parsed.data })
    .returning({ id: forumReplies.id });

  await db
    .update(forumThreads)
    .set({ replyCount: sql`${forumThreads.replyCount} + 1` })
    .where(eq(forumThreads.id, parsed.data.threadId));

  return { success: true, id: row.id };
}
