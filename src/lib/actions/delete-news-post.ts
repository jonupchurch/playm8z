"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { isCurrentUserOwner } from "@/lib/auth/require-owner";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { purgePolymorphicRefs } from "@/lib/db/purge-polymorphic-refs";
import { permanentDeleteSchema } from "@/lib/validations/admin-news";

export type DeleteNewsPostResult = { success: true } | { success: false; error: string };

// Owner-only PERMANENT delete of a news post (041, ADR 0014) -- a deliberate,
// scoped exception to ADR 0005's no-hard-delete rule: owner only, news posts
// only, always audit-logged. Distinct from save-news-post.ts's `delete` action,
// which is the soft "Unpublish" (status='draft'). The owner marker is re-checked
// SERVER-SIDE here (Principle II) -- the hidden button is only UX; a non-owner
// request is refused regardless.
export async function deleteNewsPostPermanently(input: { postId: string }): Promise<DeleteNewsPostResult> {
  let actor: { id: string };
  try {
    actor = await requireAuth();
  } catch {
    return { success: false, error: "You must be signed in." };
  }

  if (!(await isCurrentUserOwner())) {
    return { success: false, error: "Only the site owner can permanently delete a post." };
  }

  const parsed = permanentDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Capture the title BEFORE deleting so the audit entry keeps a label even
  // though the post itself is about to be gone.
  const [post] = await db.select({ title: newsPosts.title }).from(newsPosts).where(eq(newsPosts.id, parsed.data.postId));
  if (!post) {
    return { success: false, error: "Post not found." };
  }

  // Real row removal, atomically. `savedNewsPosts` has a real FK
  // (onDelete: cascade) so it goes with the post; FK-less polymorphic refs
  // (`likes`) must be purged by hand or they'd orphan (FR-007). The shared
  // helper owns which polymorphic tables get purged vs. deliberately preserved.
  await db.transaction(async (tx) => {
    await purgePolymorphicRefs(tx, "newsPost", parsed.data.postId);
    await tx.delete(newsPosts).where(eq(newsPosts.id, parsed.data.postId));
  });

  // Append-only audit trail (targetId is a value, not an FK, so it survives the
  // post's deletion).
  await logAuditEntry({
    actorId: actor.id,
    action: "permanently deleted a news post",
    category: "content",
    targetType: "newsPost",
    targetId: parsed.data.postId,
    targetLabel: post.title,
  });

  revalidatePath("/admin/news", "layout");
  revalidatePath("/news", "layout");
  return { success: true };
}
