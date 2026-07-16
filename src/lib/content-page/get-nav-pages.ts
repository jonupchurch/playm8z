import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";

export type NavPage = { slug: string; title: string };

// The nav's "Pages" dropdown: every custom page an admin has created,
// as opposed to the three seeded `system` pages (about/privacy/terms,
// scripts/seed-system-pages.ts) which have their own fixed homes --
// About is its own top-level nav item, Privacy/Terms/Cookies live in
// the footer. Drafts are excluded because /pages/[slug] already 404s
// them for anyone without moderator+, so linking one from a nav shown
// to logged-out visitors would just advertise a dead end.
export async function getNavPages(): Promise<NavPage[]> {
  return db
    .select({ slug: contentPages.slug, title: contentPages.title })
    .from(contentPages)
    .where(and(eq(contentPages.system, false), eq(contentPages.status, "published")))
    .orderBy(asc(contentPages.title));
}
