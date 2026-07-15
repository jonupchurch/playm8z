"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { dismissReportSchema, type DismissReportInput } from "@/lib/validations/admin-reports";

export type DismissReportResult = { success: true } | { success: false; error: string };

// FR-006/research.md #2: the one generic action this feature introduces
// -- resolves every currently-open report against a target, any target
// type, without touching the target's own content or its
// `moderationReviewedAt` (that's Postings'/Forum's own auto-flag-review
// scope, orthogonal to whether a *report* was founded). Unlike every
// other resolution path here, this one has no per-type owner to
// delegate to (017/018 have no "unfounded, don't touch content" concept
// distinct from Approve) -- and unlike Remove/Warn/Ban, spec.md's own
// Key Entities section doesn't call for an audit-log entry for this
// routine, high-volume triage action.
export async function dismissReport(input: DismissReportInput): Promise<DismissReportResult> {
  await requireRole("moderator");

  const parsed = dismissReportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { targetType, targetId } = parsed.data;

  const resolved = await db
    .update(reports)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(reports.targetType, targetType), eq(reports.targetId, targetId), eq(reports.status, "open")))
    .returning({ id: reports.id });

  if (resolved.length === 0) {
    return { success: false, error: "No open reports found for this target." };
  }

  revalidatePath("/admin/reports", "layout");
  return { success: true };
}
