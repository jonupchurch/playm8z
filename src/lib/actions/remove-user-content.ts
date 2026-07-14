"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { forumThreads, postings } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { removeUserContentSchema, type RemoveUserContentInput } from "@/lib/validations/admin-users";

export type RemoveUserContentResult = { success: true } | { success: false; error: string };

// FR-008/FR-009: marks removedAt (never a hard delete, ADR 0005) --
// Home's/Browse's (postings) and Forum index's (forum threads) own
// read queries already exclude rows where this is set. Logs an audit
// entry (Admin Postings 017's research.md #5 -- a retroactive fix
// closing the gap Admin Dashboard's (015) own spec always
// anticipated).
export async function removeUserContent(input: RemoveUserContentInput): Promise<RemoveUserContentResult> {
  await requireRole("moderator");
  const moderator = await requireAuth();

  const parsed = removeUserContentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let targetLabel: string | undefined;
  if (parsed.data.contentType === "posting") {
    const [row] = await db.select({ title: postings.title }).from(postings).where(eq(postings.id, parsed.data.contentId));
    if (!row) return { success: false, error: "Posting not found." };
    targetLabel = row.title;
    await db.update(postings).set({ removedAt: new Date() }).where(eq(postings.id, parsed.data.contentId));
  } else {
    const [row] = await db
      .select({ title: forumThreads.title })
      .from(forumThreads)
      .where(eq(forumThreads.id, parsed.data.contentId));
    if (!row) return { success: false, error: "Forum thread not found." };
    targetLabel = row.title;
    await db.update(forumThreads).set({ removedAt: new Date() }).where(eq(forumThreads.id, parsed.data.contentId));
  }

  await logAuditEntry({
    actorId: moderator.id,
    action: parsed.data.contentType === "posting" ? "removed a posting" : "removed a forum thread",
    category: "moderation",
    targetType: parsed.data.contentType,
    targetId: parsed.data.contentId,
    targetLabel,
  });

  revalidatePath("/admin/users", "layout");
  return { success: true };
}
