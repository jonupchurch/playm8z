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

// FR-007/FR-008: a real row removal.
//
// This is a deliberate carve-out from ADR 0005 (never hard-delete),
// recorded in that ADR's own 2026-07-16 amendment. It previously set
// `status = 'draft'` to honour the ADR, but that made Delete identical
// to the Unpublish button sitting next to it, and a silent no-op on a
// page that was already a draft -- so junk drafts could never be
// cleared. The ADR's two stated concerns don't bite here: nothing holds
// a foreign key to contentPages (so no row is orphaned), and audit
// entries denormalise `targetLabel`, so the record of the deletion
// outlives the page itself.
//
// Still rejects `system = true` targets outright, since system pages
// never offer Delete at all -- a defense-in-depth check behind the UI's
// own gate.
export async function deleteContentPage(input: DeleteContentPageInput): Promise<DeleteContentPageResult> {
  await requireRole("moderator");
  const moderator = await requireAuth();

  const parsed = deleteContentPageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const deleted = await db
    .delete(contentPages)
    .where(and(eq(contentPages.id, parsed.data.pageId), eq(contentPages.system, false)))
    .returning({ id: contentPages.id, title: contentPages.title, slug: contentPages.slug });

  if (deleted.length === 0) {
    return { success: false, error: "Page not found, or system pages cannot be deleted." };
  }

  await logAuditEntry({
    actorId: moderator.id,
    action: "deleted a content page",
    category: "content",
    targetType: "contentPage",
    targetId: deleted[0].id,
    targetLabel: deleted[0].title,
  });

  revalidatePath("/admin/content-pages", "layout");
  revalidatePath(`/pages/${deleted[0].slug}`);
  return { success: true };
}
