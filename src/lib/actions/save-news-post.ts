"use server";

import { eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { saveNewsPostSchema, type SaveNewsPostInput } from "@/lib/validations/admin-news";

export type SaveNewsPostResult = { success: true; id: string } | { success: false; error: string };

// News Article detail (023)/research.md #2: a human-legible slug
// derived from the title, checked against the same collision-suffix
// approach Admin Content Pages' (021) create-content-page.ts already
// established. Generated once, at creation only -- never regenerated
// on a later title edit, so a shared/bookmarked article URL stays
// stable.
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "post";
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function generateUniqueSlug(tx: Tx, title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const [existing] = await tx.select({ id: newsPosts.id }).from(newsPosts).where(eq(newsPosts.slug, candidate)).limit(1);
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

// research.md #1: one save action, discriminated by `action` --
// publish/schedule/save-draft/delete are all just this row getting a
// different status/publishedAt/featured combination. research.md #5: `publish`
// only sets publishedAt=now() when the row isn't ALREADY published (a
// genuine first-time publish, not an edit to one) -- "Update" never
// re-dates an already-live post. research.md #2: `featured` is
// exclusive across every row, enforced in the same transaction as the
// row write, for every action (pin state travels with whichever
// footer action the moderator clicks, not its own separate save).
export async function saveNewsPost(input: SaveNewsPostInput): Promise<SaveNewsPostResult> {
  await requireRole("moderator");
  const actor = await requireAuth();

  const parsed = saveNewsPostSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { postId, title, excerpt, body, category, cover, featured, tags, action, publishDate } = parsed.data;

  if (action === "delete" && !postId) {
    return { success: false, error: "Cannot delete a post that hasn't been saved yet." };
  }

  const result = await db.transaction(async (tx) => {
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

    const values = { title, excerpt, body, category, cover, status, featured, tags, ...(publishedAt ? { publishedAt } : {}) };

    let rowId: string;
    if (postId) {
      await tx.update(newsPosts).set(values).where(eq(newsPosts.id, postId));
      rowId = postId;
    } else {
      const slug = await generateUniqueSlug(tx, title);
      const [row] = await tx.insert(newsPosts).values({ ...values, slug }).returning({ id: newsPosts.id });
      rowId = row.id;
    }

    if (featured) {
      await tx.update(newsPosts).set({ featured: false }).where(ne(newsPosts.id, rowId));
    }

    return { id: rowId, existingStatus };
  });

  if (!result) {
    return { success: false, error: "Post not found." };
  }
  const { id, existingStatus } = result;

  // FR-007 (research.md #2, the gap this feature/025 closes): only
  // publish/schedule/update actually log -- save-draft/delete aren't
  // named in that gap-fix scope.
  let auditAction: string | null = null;
  if (action === "schedule") auditAction = "scheduled a news post";
  else if (action === "publish") auditAction = existingStatus === "published" ? "updated a news post" : "published a news post";
  if (auditAction) {
    await logAuditEntry({ actorId: actor.id, action: auditAction, category: "content", targetType: "newsPost", targetId: id, targetLabel: title });
  }

  revalidatePath("/admin/news", "layout");
  revalidatePath("/news", "layout");
  return { success: true, id };
}
