"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { postings, reports, warnings } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { resolvePostingReportSchema, type ResolvePostingReportInput } from "@/lib/validations/admin-postings";

export type ResolvePostingReportResult = { success: true } | { success: false; error: string };

const ACTION_LABEL: Record<"approve" | "remove" | "warn", string> = {
  approve: "approved a posting",
  remove: "removed a posting",
  warn: "warned a posting's author",
};

// FR-007/FR-008/FR-009/FR-011: the shared resolution path for Approve/
// Remove/Warn -- all three resolve every open report against the
// posting; only the posting's own removedAt-vs-moderationReviewedAt
// effect and Warn's extra warnings row differ. Reports/posting/
// warnings changes happen in one transaction (accept-request.ts's own
// precedent for multi-row moderation state); the audit-log write
// (this feature's first real call to logAuditEntry(), 015) happens
// right after -- a supplementary log, not core state, so it doesn't
// need to share the same transaction.
export async function resolvePostingReport(input: ResolvePostingReportInput): Promise<ResolvePostingReportResult> {
  await requireRole("moderator");
  const moderator = await requireAuth();

  const parsed = resolvePostingReportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { postingId, resolution, warningReason } = parsed.data;

  const posting = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: postings.id, title: postings.title, hostId: postings.hostId })
      .from(postings)
      .where(eq(postings.id, postingId));
    if (!row) return null;

    await tx
      .update(reports)
      .set({ status: "resolved" })
      .where(and(eq(reports.targetType, "posting"), eq(reports.targetId, postingId), eq(reports.status, "open")));

    if (resolution === "remove") {
      await tx.update(postings).set({ removedAt: new Date() }).where(eq(postings.id, postingId));
    } else {
      await tx.update(postings).set({ moderationReviewedAt: new Date() }).where(eq(postings.id, postingId));
    }

    if (resolution === "warn") {
      await tx.insert(warnings).values({
        userId: row.hostId,
        moderatorId: moderator.id,
        postingId: row.id,
        reason: warningReason,
      });
    }

    return row;
  });

  if (!posting) {
    return { success: false, error: "Posting not found." };
  }

  await logAuditEntry({
    actorId: moderator.id,
    action: ACTION_LABEL[resolution],
    category: "moderation",
    targetType: "posting",
    targetId: posting.id,
    targetLabel: posting.title,
    reason: warningReason,
  });

  revalidatePath("/admin/postings", "layout");
  revalidatePath("/admin/users", "layout");
  return { success: true };
}
