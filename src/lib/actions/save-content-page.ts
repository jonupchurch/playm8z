"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { saveContentPageSchema, type SaveContentPageInput } from "@/lib/validations/content-page";

// `slug` is echoed back because a rename changes the page's own URL --
// the editor is sitting on /pages/<old> and has to navigate to the new
// one once this returns.
export type SaveContentPageResult = { success: true; slug: string } | { success: false; error: string };

// FR-006: the entire title+slug+blocks array persists atomically, in one
// UPDATE -- there's no partial-block-update path (research.md #3).
// requireRole (Error Pages' 002, its first real consumer here) is
// called directly, not caught into a friendly error string, so a
// rejection renders the same forbidden/unauthorized boundary any other
// `/admin/*`-style gate will eventually use (plan.md).
//
// `currentSlug` identifies the row; `input.slug` is what it should
// become. They differ only on a rename.
export async function saveContentPage(currentSlug: string, input: SaveContentPageInput): Promise<SaveContentPageResult> {
  await requireRole("moderator");

  const parsed = saveContentPageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [existing] = await db
    .select({ id: contentPages.id, slug: contentPages.slug, system: contentPages.system })
    .from(contentPages)
    .where(eq(contentPages.slug, currentSlug))
    .limit(1);
  if (!existing) {
    return { success: false, error: "Page not found." };
  }

  const nextSlug = parsed.data.slug;
  const renaming = nextSlug !== existing.slug;

  // The nav's About item and the footer's Terms/Privacy/Cookies links
  // hardcode the system slugs, so letting one move would break them
  // sitewide with no warning. The editor doesn't offer the field for
  // system pages; this is the matching server-side gate.
  if (renaming && existing.system) {
    return { success: false, error: "A system page's URL can't be changed." };
  }

  if (renaming) {
    const [taken] = await db
      .select({ id: contentPages.id })
      .from(contentPages)
      .where(and(eq(contentPages.slug, nextSlug), ne(contentPages.id, existing.id)))
      .limit(1);
    if (taken) {
      return { success: false, error: "That URL is already taken." };
    }
  }

  try {
    await db
      .update(contentPages)
      .set({ title: parsed.data.title, slug: nextSlug, blocks: parsed.data.blocks, updatedAt: new Date() })
      .where(eq(contentPages.id, existing.id));
  } catch (error) {
    // The check above is a friendlier message, not a guarantee -- two
    // admins renaming to the same slug at once both pass it and race to
    // the unique index. Drizzle wraps the postgres.js error, so the real
    // code is on `cause`, not the error itself.
    const code = (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505") {
      return { success: false, error: "That URL is already taken." };
    }
    throw error;
  }

  // Tech-debt #7: audit content-page edits, matching create/delete/toggle-page-status
  // (015 anticipated the log; only the edit path was left out). requireAuth here is safe
  // -- requireRole above already established a valid admin session.
  const moderator = await requireAuth();
  await logAuditEntry({
    actorId: moderator.id,
    action: renaming ? "renamed a content page" : "edited a content page",
    category: "content",
    targetType: "contentPage",
    targetId: existing.id,
    targetLabel: parsed.data.title,
  });

  revalidatePath(`/pages/${currentSlug}`);
  if (renaming) revalidatePath(`/pages/${nextSlug}`);
  revalidatePath("/admin/content-pages", "layout");
  return { success: true, slug: nextSlug };
}
