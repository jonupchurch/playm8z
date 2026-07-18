"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, users } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { computeAutoFlagReason } from "@/lib/moderation/auto-flag-rules";
import { notifyMentions } from "@/lib/notifications/notify-events";
import { getSettings } from "@/lib/settings/get-settings";
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

  // Admin Forum (018)/FR-013: the shared, deterministic auto-flag
  // ruleset (extracted from Admin Postings, 017) applied at creation
  // time -- "first posting" here means the author's first-ever forum
  // content (thread OR reply), not specific to threads alone.
  const [[authorRow], [{ n: existingThreadCount }], [{ n: existingReplyCount }], moderationSettings] = await Promise.all([
    db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, author.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(forumThreads).where(eq(forumThreads.authorId, author.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(forumReplies).where(eq(forumReplies.authorId, author.id)),
    getSettings(),
  ]);
  const accountAgeDays = (Date.now() - authorRow.createdAt.getTime()) / 86_400_000;
  const autoFlagReason = computeAutoFlagReason(
    `${parsed.data.title} ${parsed.data.body}`,
    accountAgeDays,
    existingThreadCount === 0 && existingReplyCount === 0,
    moderationSettings,
  );

  const [row] = await db
    .insert(forumThreads)
    .values({ authorId: author.id, ...parsed.data, autoFlagReason })
    .returning({ id: forumThreads.id });

  // Best-effort (040): a new thread's original post can @mention people. There
  // is no one to notify as a `reply` yet, so only mentions apply; the author is
  // excluded so a self-mention is a no-op.
  await notifyMentions({
    actorId: author.id,
    threadId: row.id,
    threadTitle: parsed.data.title,
    body: parsed.data.body,
    excludeUserIds: [author.id],
  });

  return { success: true, id: row.id };
}
