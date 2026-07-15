"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, users } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { toggleUserBan } from "@/lib/actions/toggle-user-ban";
import { resolveForumReport } from "@/lib/actions/resolve-forum-report";
import { banForumAuthorSchema, type BanForumAuthorInput } from "@/lib/validations/admin-forum";

export type BanForumAuthorResult = { success: true } | { success: false; error: string };

// FR-011: bans the thread's/reply's author (delegates to Admin Users'
// (016) existing toggle-user-ban.ts -- no second ban implementation)
// and removes the thread/reply under review via the same path
// resolveForumReport uses for "remove" -- same reasoning as Admin
// Postings' (017) banPostingAuthor. toggleUserBan is a true toggle, so
// this only invokes it when the author isn't already banned.
export async function banForumAuthor(input: BanForumAuthorInput): Promise<BanForumAuthorResult> {
  await requireRole("moderator");

  const parsed = banForumAuthorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { targetType, targetId } = parsed.data;

  const table = targetType === "forumThread" ? forumThreads : forumReplies;
  const [row] = await db.select({ id: table.id, authorId: table.authorId }).from(table).where(eq(table.id, targetId));
  if (!row) {
    return { success: false, error: targetType === "forumThread" ? "Thread not found." : "Reply not found." };
  }

  const [author] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, row.authorId));
  if (!author) {
    return { success: false, error: "Author not found." };
  }

  if (!author.bannedAt) {
    const banResult = await toggleUserBan({ userId: row.authorId });
    if (!banResult.success) {
      return banResult;
    }
  }

  return resolveForumReport({ targetType, targetId, resolution: "remove" });
}
