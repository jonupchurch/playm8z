"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";

export type CreateContentPageResult = { success: true; slug: string } | { success: false; error: string };

// research.md #4: "untitled-page", appending an incrementing numeric
// suffix if the base slug is already taken -- a human-legible starting
// point requiring no admin input, checked against `014`'s existing
// unique `slug` constraint. Bare (no leading slash), matching `014`'s
// real slug convention -- see seed-system-pages.ts's own note.
async function generateUniqueSlug(): Promise<string> {
  const base = "untitled-page";
  let candidate = base;
  let suffix = 2;
  while (true) {
    const [existing] = await db.select({ id: contentPages.id }).from(contentPages).where(eq(contentPages.slug, candidate)).limit(1);
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

// FR-006: "+ New page" creates a blank draft (title "Untitled page",
// `system = false`) ready for `014`'s own inline-edit affordance --
// this feature never builds a second content-editing UI.
export async function createContentPage(): Promise<CreateContentPageResult> {
  await requireRole("moderator");

  const slug = await generateUniqueSlug();

  await db.insert(contentPages).values({ slug, title: "Untitled page", status: "draft", system: false });

  revalidatePath("/admin/content-pages", "layout");
  return { success: true, slug };
}
