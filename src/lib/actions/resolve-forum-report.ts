"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { forumReplies, forumThreads, reports, warnings } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { resolveForumReportSchema, type ResolveForumReportInput } from "@/lib/validations/admin-forum";

export type ResolveForumReportResult = { success: true } | { success: false; error: string };

function actionLabel(resolution: "approve" | "remove" | "lock" | "warn", isThread: boolean): string {
  const noun = isThread ? "thread" : "reply";
  if (resolution === "approve") return `approved a forum ${noun}`;
  if (resolution === "remove") return `removed a forum ${noun}`;
  if (resolution === "lock") return "locked a forum thread";
  return `warned a forum ${noun}'s author`;
}

// FR-007/FR-008/FR-009/FR-010: the shared resolution path for Approve/
// Remove/Lock/Warn against either a thread or a reply -- mirrors Admin
// Postings' (017) resolvePostingReport, branched per table since
// forumThreads/forumReplies have different shapes (only threads have a
// title, only threads can be locked). Reports/content/warnings changes
// happen in one transaction; the audit-log write happens right after --
// a supplementary log, not core state (017's own precedent).
export async function resolveForumReport(input: ResolveForumReportInput): Promise<ResolveForumReportResult> {
  await requireRole("moderator");
  const moderator = await requireAuth();

  const parsed = resolveForumReportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { targetType, targetId, resolution, warningReason } = parsed.data;

  // research.md #6: Lock is thread-only, re-verified server-side, not
  // just hidden in the UI (Principle II).
  if (resolution === "lock" && targetType !== "forumThread") {
    return { success: false, error: "Only threads can be locked." };
  }

  const outcome = await db.transaction(async (tx) => {
    if (targetType === "forumThread") {
      const [row] = await tx
        .select({ id: forumThreads.id, title: forumThreads.title, authorId: forumThreads.authorId })
        .from(forumThreads)
        .where(eq(forumThreads.id, targetId));
      if (!row) return null;

      await tx
        .update(reports)
        .set({ status: "resolved" })
        .where(and(eq(reports.targetType, "forum"), eq(reports.targetId, targetId), eq(reports.status, "open")));

      if (resolution === "remove") {
        await tx.update(forumThreads).set({ removedAt: new Date() }).where(eq(forumThreads.id, targetId));
      } else if (resolution === "lock") {
        await tx.update(forumThreads).set({ locked: true }).where(eq(forumThreads.id, targetId));
      } else {
        await tx.update(forumThreads).set({ moderationReviewedAt: new Date() }).where(eq(forumThreads.id, targetId));
      }

      if (resolution === "warn") {
        await tx.insert(warnings).values({
          userId: row.authorId,
          moderatorId: moderator.id,
          targetType: "forumThread",
          targetId: row.id,
          reason: warningReason,
        });
      }

      return { id: row.id, label: row.title };
    }

    const [row] = await tx
      .select({ id: forumReplies.id, body: forumReplies.body, authorId: forumReplies.authorId })
      .from(forumReplies)
      .where(eq(forumReplies.id, targetId));
    if (!row) return null;

    await tx
      .update(reports)
      .set({ status: "resolved" })
      .where(and(eq(reports.targetType, "forum"), eq(reports.targetId, targetId), eq(reports.status, "open")));

    if (resolution === "remove") {
      await tx.update(forumReplies).set({ removedAt: new Date() }).where(eq(forumReplies.id, targetId));
    } else {
      await tx.update(forumReplies).set({ moderationReviewedAt: new Date() }).where(eq(forumReplies.id, targetId));
    }

    if (resolution === "warn") {
      await tx.insert(warnings).values({
        userId: row.authorId,
        moderatorId: moderator.id,
        targetType: "forumReply",
        targetId: row.id,
        reason: warningReason,
      });
    }

    return { id: row.id, label: row.body.slice(0, 60) };
  });

  if (!outcome) {
    return { success: false, error: targetType === "forumThread" ? "Thread not found." : "Reply not found." };
  }

  await logAuditEntry({
    actorId: moderator.id,
    action: actionLabel(resolution, targetType === "forumThread"),
    category: "moderation",
    targetType,
    targetId: outcome.id,
    targetLabel: outcome.label,
    reason: warningReason,
  });

  revalidatePath("/admin/forum", "layout");
  revalidatePath("/admin/users", "layout");
  revalidatePath("/admin/postings", "layout");
  return { success: true };
}
