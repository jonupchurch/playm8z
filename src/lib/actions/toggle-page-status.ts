"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { togglePageStatusSchema, type TogglePageStatusInput } from "@/lib/validations/content-page";

export type TogglePageStatusResult = { success: true } | { success: false; error: string };

// FR-008: publish/draft transitions freely, any number of times
// (data-model.md's State notes) -- no history/audit trail beyond the
// single current `status` value (the append-only auditEntries log,
// 025's own gap fix, is a separate record of the ACT of toggling, not
// a second source of truth for the current value).
export async function togglePageStatus(input: TogglePageStatusInput): Promise<TogglePageStatusResult> {
  await requireRole("moderator");
  const moderator = await requireAuth();

  const parsed = togglePageStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [row] = await db
    .update(contentPages)
    .set({ status: parsed.data.status })
    .where(eq(contentPages.slug, parsed.data.slug))
    .returning({ id: contentPages.id, title: contentPages.title });

  if (row) {
    await logAuditEntry({
      actorId: moderator.id,
      action: parsed.data.status === "published" ? "published a content page" : "unpublished a content page",
      category: "content",
      targetType: "contentPage",
      targetId: row.id,
      targetLabel: row.title,
    });
  }

  revalidatePath(`/pages/${parsed.data.slug}`);
  return { success: true };
}
