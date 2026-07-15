"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { deleteContentPageSchema, type DeleteContentPageInput } from "@/lib/validations/admin-content-pages";

export type DeleteContentPageResult = { success: true } | { success: false; error: string };

// FR-007/FR-008 (ADR 0005): unconditionally sets `status = 'draft'` --
// never a row removal, and never a toggle (Delete must always land on
// draft regardless of current status, research.md #1). Rejects
// `system = true` targets outright, since system pages never offer
// Delete at all -- a defense-in-depth check behind the UI's own gate.
export async function deleteContentPage(input: DeleteContentPageInput): Promise<DeleteContentPageResult> {
  await requireRole("moderator");
  const moderator = await requireAuth();

  const parsed = deleteContentPageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const updated = await db
    .update(contentPages)
    .set({ status: "draft" })
    .where(and(eq(contentPages.id, parsed.data.pageId), eq(contentPages.system, false)))
    .returning({ id: contentPages.id, title: contentPages.title });

  if (updated.length === 0) {
    return { success: false, error: "Page not found, or system pages cannot be deleted." };
  }

  await logAuditEntry({
    actorId: moderator.id,
    action: "deleted a content page",
    category: "content",
    targetType: "contentPage",
    targetId: updated[0].id,
    targetLabel: updated[0].title,
  });

  revalidatePath("/admin/content-pages", "layout");
  return { success: true };
}
