"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { saveContentPageSchema, type SaveContentPageInput } from "@/lib/validations/content-page";

export type SaveContentPageResult = { success: true } | { success: false; error: string };

// FR-006: the entire title+blocks array persists atomically, in one
// UPDATE -- there's no partial-block-update path (research.md #3).
// requireRole (Error Pages' 002, its first real consumer here) is
// called directly, not caught into a friendly error string, so a
// rejection renders the same forbidden/unauthorized boundary any other
// `/admin/*`-style gate will eventually use (plan.md).
export async function saveContentPage(slug: string, input: SaveContentPageInput): Promise<SaveContentPageResult> {
  await requireRole("moderator");

  const parsed = saveContentPageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db
    .update(contentPages)
    .set({ title: parsed.data.title, blocks: parsed.data.blocks, updatedAt: new Date() })
    .where(eq(contentPages.slug, slug));

  revalidatePath(`/pages/${slug}`);
  return { success: true };
}
