"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { messages, reports, users, warnings } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { classifyForumTarget } from "@/lib/moderation/classify-forum-target";
import { resolvePostingReport } from "@/lib/actions/resolve-posting-report";
import { resolveForumReport } from "@/lib/actions/resolve-forum-report";
import { resolveReportActionSchema, type ResolveReportActionInput } from "@/lib/validations/admin-reports";

export type ResolveReportActionResult = { success: true } | { success: false; error: string };

// FR-007/FR-008/research.md #2: Remove/Warn, branching by target type.
// Posting/forum targets already have a fully-correct, tested resolution
// path (audit logging, `moderationReviewedAt` effects) -- delegating
// guarantees acting from this feature behaves identically to acting
// from `017`'s/`018`'s own queue, never a second, slightly-different
// implementation. Messages/profiles have no prior dedicated queue, so
// this feature is their first real mover, handled directly.
export async function resolveReportAction(input: ResolveReportActionInput): Promise<ResolveReportActionResult> {
  await requireRole("moderator");
  const moderator = await requireAuth();

  const parsed = resolveReportActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { targetType, targetId, resolution, warningReason } = parsed.data;

  if (targetType === "posting") {
    return resolvePostingReport({ postingId: targetId, resolution, warningReason });
  }

  if (targetType === "forum") {
    const forumTargetType = await classifyForumTarget(targetId);
    if (!forumTargetType) {
      return { success: false, error: "Reported content not found." };
    }
    return resolveForumReport({ targetType: forumTargetType, targetId, resolution, warningReason });
  }

  if (targetType === "message") {
    if (resolution === "remove") {
      const removed = await db
        .update(messages)
        .set({ removedAt: new Date() })
        .where(eq(messages.id, targetId))
        .returning({ id: messages.id, body: messages.body });
      if (removed.length === 0) {
        return { success: false, error: "Message not found." };
      }
      await db
        .update(reports)
        .set({ status: "resolved", resolvedAt: new Date() })
        .where(and(eq(reports.targetType, "message"), eq(reports.targetId, targetId), eq(reports.status, "open")));

      await logAuditEntry({
        actorId: moderator.id,
        action: "removed a message",
        category: "moderation",
        targetType: "message",
        targetId,
        targetLabel: removed[0].body.slice(0, 60),
      });
      revalidatePath("/admin/reports", "layout");
      revalidatePath("/admin/users", "layout");
      return { success: true };
    }

    // warn
    const [message] = await db.select({ id: messages.id, senderId: messages.senderId }).from(messages).where(eq(messages.id, targetId));
    if (!message) {
      return { success: false, error: "Message not found." };
    }
    if (!message.senderId) {
      return { success: false, error: "System messages have no author to warn." };
    }

    await db
      .update(reports)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(and(eq(reports.targetType, "message"), eq(reports.targetId, targetId), eq(reports.status, "open")));
    await db.insert(warnings).values({
      userId: message.senderId,
      moderatorId: moderator.id,
      targetType: "message",
      targetId: message.id,
      reason: warningReason,
    });

    await logAuditEntry({
      actorId: moderator.id,
      action: "warned a message's author",
      category: "moderation",
      targetType: "message",
      targetId,
      reason: warningReason,
    });
    revalidatePath("/admin/reports", "layout");
    revalidatePath("/admin/users", "layout");
    return { success: true };
  }

  // targetType === "user" (profile) -- FR-007: no removable content
  // distinct from the account itself.
  if (resolution === "remove") {
    return { success: false, error: "Remove content is not available for profile reports." };
  }

  const [user] = await db.select({ id: users.id, handle: users.handle }).from(users).where(eq(users.id, targetId));
  if (!user) {
    return { success: false, error: "User not found." };
  }

  await db
    .update(reports)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(reports.targetType, "user"), eq(reports.targetId, targetId), eq(reports.status, "open")));
  await db.insert(warnings).values({
    userId: user.id,
    moderatorId: moderator.id,
    targetType: null,
    targetId: null,
    reason: warningReason,
  });

  await logAuditEntry({
    actorId: moderator.id,
    action: "warned a user's profile",
    category: "moderation",
    targetType: "user",
    targetId,
    targetLabel: user.handle ?? undefined,
    reason: warningReason,
  });
  revalidatePath("/admin/reports", "layout");
  revalidatePath("/admin/users", "layout");
  return { success: true };
}
