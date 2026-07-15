"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, messages, postings, reports, users } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { toggleUserBan } from "@/lib/actions/toggle-user-ban";
import { classifyForumTarget } from "@/lib/moderation/classify-forum-target";
import { resolveReportAction } from "@/lib/actions/resolve-report-action";
import { banReportedUserSchema, type BanReportedUserInput } from "@/lib/validations/admin-reports";

export type BanReportedUserResult = { success: true } | { success: false; error: string };

// FR-009: bans the reported user (delegates to Admin Users' 016
// toggle-user-ban.ts, same as `017`'s/`018`'s own ban wrappers) and,
// when the report targets a posting/thread/reply/message, also removes
// that specific content via the same delegation `resolveReportAction`'s
// own "remove" path already uses -- one path, not a second
// implementation. A profile-target ban is account-only (there's no
// removable content distinct from the account, FR-007) -- its own open
// reports still resolve, matching Dismiss's own "resolve, no content
// change" side effect.
export async function banReportedUser(input: BanReportedUserInput): Promise<BanReportedUserResult> {
  await requireRole("moderator");

  const parsed = banReportedUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { targetType, targetId } = parsed.data;

  let userId: string;
  if (targetType === "user") {
    userId = targetId;
  } else if (targetType === "posting") {
    const [row] = await db.select({ hostId: postings.hostId }).from(postings).where(eq(postings.id, targetId));
    if (!row) return { success: false, error: "Posting not found." };
    userId = row.hostId;
  } else if (targetType === "forum") {
    const forumTargetType = await classifyForumTarget(targetId);
    if (!forumTargetType) return { success: false, error: "Reported content not found." };
    const table = forumTargetType === "forumThread" ? forumThreads : forumReplies;
    const [row] = await db.select({ authorId: table.authorId }).from(table).where(eq(table.id, targetId));
    if (!row) return { success: false, error: "Reported content not found." };
    userId = row.authorId;
  } else {
    const [row] = await db.select({ senderId: messages.senderId }).from(messages).where(eq(messages.id, targetId));
    if (!row || !row.senderId) return { success: false, error: "Message or its author not found." };
    userId = row.senderId;
  }

  const [user] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId));
  if (!user) {
    return { success: false, error: "User not found." };
  }

  if (!user.bannedAt) {
    const banResult = await toggleUserBan({ userId });
    if (!banResult.success) {
      return banResult;
    }
  }

  if (targetType === "user") {
    await db
      .update(reports)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(and(eq(reports.targetType, "user"), eq(reports.targetId, targetId), eq(reports.status, "open")));
    return { success: true };
  }

  return resolveReportAction({ targetType, targetId, resolution: "remove" });
}
