"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, users } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { computeAutoFlagReason } from "@/lib/moderation/auto-flag-rules";
import { postReplySchema, type PostReplyInput } from "@/lib/validations/forum-thread";

export type PostReplyResult = { success: true; id: string } | { success: false; error: string };

// FR-006/FR-007: posts a reply (optionally quoting another) and keeps
// the thread's own denormalized replyCount in sync -- this feature is
// forumReplies' only writer. Admin Forum (018) adds two amendments: the
// shared, deterministic auto-flag ruleset at creation time (research.md
// #3), and rejecting a reply to a locked thread (research.md #6) --
// re-verified here server-side, not just hidden in the UI (Principle
// II), since a "Lock" that only changes a flag with no enforcement
// would be decorative.
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

  const [thread] = await db.select({ locked: forumThreads.locked }).from(forumThreads).where(eq(forumThreads.id, parsed.data.threadId));
  if (!thread) {
    return { success: false, error: "Thread not found." };
  }
  if (thread.locked) {
    return { success: false, error: "This thread is locked and no longer accepting replies." };
  }

  const [[authorRow], [{ n: existingThreadCount }], [{ n: existingReplyCount }]] = await Promise.all([
    db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, author.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(forumThreads).where(eq(forumThreads.authorId, author.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(forumReplies).where(eq(forumReplies.authorId, author.id)),
  ]);
  const accountAgeDays = (Date.now() - authorRow.createdAt.getTime()) / 86_400_000;
  const autoFlagReason = computeAutoFlagReason(parsed.data.body, accountAgeDays, existingThreadCount === 0 && existingReplyCount === 0);

  const [row] = await db
    .insert(forumReplies)
    .values({ authorId: author.id, ...parsed.data, autoFlagReason })
    .returning({ id: forumReplies.id });

  await db
    .update(forumThreads)
    .set({ replyCount: sql`${forumThreads.replyCount} + 1` })
    .where(eq(forumThreads.id, parsed.data.threadId));

  return { success: true, id: row.id };
}
