"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";

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
  const moderator = await requireAuth();

  // generateUniqueSlug() is a best-effort check, not a guarantee: two concurrent
  // "+ New page" clicks can both pick the same base slug and race the unique index.
  // Insert with onConflictDoNothing and, on a lost race (empty returning), regenerate
  // and retry -- the INSERT analog of save-content-page.ts's rename 23505 catch, so a
  // concurrent create gets the next suffix instead of a 500.
  let row: { id: string } | undefined;
  let slug = "";
  for (let attempt = 0; attempt < 5 && !row; attempt += 1) {
    slug = await generateUniqueSlug();
    const inserted = await db
      .insert(contentPages)
      .values({ slug, title: "Untitled page", status: "draft", system: false })
      .onConflictDoNothing()
      .returning({ id: contentPages.id });
    if (inserted.length) row = inserted[0];
  }
  if (!row) {
    return { success: false, error: "Couldn't create a new page. Please try again." };
  }

  // 025's own gap fix (research.md #2) -- this feature never wired
  // logAuditEntry() despite 015's own spec anticipating it.
  await logAuditEntry({
    actorId: moderator.id,
    action: "created a content page",
    category: "content",
    targetType: "contentPage",
    targetId: row.id,
    targetLabel: "Untitled page",
  });

  revalidatePath("/admin/content-pages", "layout");
  return { success: true, slug };
}
