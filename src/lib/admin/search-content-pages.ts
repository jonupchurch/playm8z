import { desc } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import type { ContentPagesFilters } from "@/lib/validations/admin-content-pages";

export type AdminContentPageRow = {
  id: string;
  slug: string;
  title: string;
  status: "published" | "draft";
  system: boolean;
  updatedAt: Date;
};

export type ContentPagesStats = { total: number; published: number; draft: number; system: number };
export type ContentPagesResult = { stats: ContentPagesStats; rows: AdminContentPageRow[] };

// research.md #5: fetch-all-then-filter-in-app-code, Admin News' (020)
// own small-bounded-list precedent, not Admin Users'/Browse's SQL-
// filtered pattern -- the number of static pages a site has is
// inherently small. Stats always reflect ALL pages, unaffected by the
// current search/filter (same "independent of current view" precedent
// used throughout the admin cluster).
export async function searchContentPages(filters: ContentPagesFilters): Promise<ContentPagesResult> {
  const all = await db
    .select({
      id: contentPages.id,
      slug: contentPages.slug,
      title: contentPages.title,
      status: contentPages.status,
      system: contentPages.system,
      updatedAt: contentPages.updatedAt,
    })
    .from(contentPages)
    .orderBy(desc(contentPages.updatedAt));

  const stats: ContentPagesStats = {
    total: all.length,
    published: all.filter((page) => page.status === "published").length,
    draft: all.filter((page) => page.status !== "published").length,
    system: all.filter((page) => page.system).length,
  };

  const q = filters.q.trim().toLowerCase();
  const rows = all
    .filter((page) => {
      const matchesFilter =
        filters.filter === "all" || (filters.filter === "system" ? page.system : page.status === filters.filter);
      const matchesQuery = !q || `${page.title} ${page.slug}`.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    })
    .map((page) => ({ ...page, status: page.status === "published" ? ("published" as const) : ("draft" as const) }));

  return { stats, rows };
}
