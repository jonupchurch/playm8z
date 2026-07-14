"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { forumThreads, postings } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { removeUserContentSchema, type RemoveUserContentInput } from "@/lib/validations/admin-users";

export type RemoveUserContentResult = { success: true } | { success: false; error: string };

// FR-008/FR-009: marks removedAt (never a hard delete, ADR 0005) --
// Home's/Browse's (postings) and Forum index's (forum threads) own
// read queries already exclude rows where this is set.
export async function removeUserContent(input: RemoveUserContentInput): Promise<RemoveUserContentResult> {
  await requireRole("moderator");

  const parsed = removeUserContentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.contentType === "posting") {
    await db.update(postings).set({ removedAt: new Date() }).where(eq(postings.id, parsed.data.contentId));
  } else {
    await db.update(forumThreads).set({ removedAt: new Date() }).where(eq(forumThreads.id, parsed.data.contentId));
  }

  revalidatePath("/admin/users", "layout");
  return { success: true };
}
