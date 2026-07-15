"use server";

import { eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { saveNewsPostSchema, type SaveNewsPostInput } from "@/lib/validations/admin-news";

export type SaveNewsPostResult = { success: true; id: string } | { success: false; error: string };

// research.md #1: one save action, discriminated by `action` --
// publish/schedule/save-draft/delete are all just this row getting a
// different status/publishedAt combination. research.md #5: `publish`
// only sets publishedAt=now() when the row isn't ALREADY published (a
// genuine first-time publish, not an edit to one) -- "Update" never
// re-dates an already-live post. research.md #2: `featured` is
// exclusive across every row, enforced in the same transaction as the
// row write, for every action (pin state travels with whichever
// footer action the moderator clicks, not its own separate save).
export async function saveNewsPost(input: SaveNewsPostInput): Promise<SaveNewsPostResult> {
  await requireRole("moderator");

  const parsed = saveNewsPostSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { postId, title, excerpt, body, category, cover, featured, action, publishDate } = parsed.data;

  if (action === "delete" && !postId) {
    return { success: false, error: "Cannot delete a post that hasn't been saved yet." };
  }

  const id = await db.transaction(async (tx) => {
    let existingStatus: string | undefined;
    if (postId) {
      const [row] = await tx.select({ status: newsPosts.status }).from(newsPosts).where(eq(newsPosts.id, postId));
      if (!row) return null;
      existingStatus = row.status;
    }

    let status: "draft" | "published" | "scheduled";
    let publishedAt: Date | undefined;

    if (action === "delete" || action === "save-draft") {
      // FR-007/FR-009: Save draft always overrides to draft regardless
      // of the on-screen status control; Delete is the ADR-0005-safe
      // "Unpublish" -- neither touches publishedAt.
      status = "draft";
    } else if (action === "schedule") {
      status = "scheduled";
      publishedAt = publishDate;
    } else {
      status = "published";
      if (existingStatus !== "published") {
        publishedAt = new Date();
      }
    }

    const values = { title, excerpt, body, category, cover, status, featured, ...(publishedAt ? { publishedAt } : {}) };

    let rowId: string;
    if (postId) {
      await tx.update(newsPosts).set(values).where(eq(newsPosts.id, postId));
      rowId = postId;
    } else {
      const [row] = await tx.insert(newsPosts).values(values).returning({ id: newsPosts.id });
      rowId = row.id;
    }

    if (featured) {
      await tx.update(newsPosts).set({ featured: false }).where(ne(newsPosts.id, rowId));
    }

    return rowId;
  });

  if (!id) {
    return { success: false, error: "Post not found." };
  }

  revalidatePath("/admin/news", "layout");
  revalidatePath("/news", "layout");
  return { success: true, id };
}
