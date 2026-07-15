import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { searchContentPages } from "./search-content-pages";

describe("searchContentPages (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const pageIds: string[] = [];

  afterAll(async () => {
    for (const id of pageIds) await db.delete(contentPages).where(eq(contentPages.id, id));
  });

  it("computes stats and matches search+filter, including system pages", async () => {
    const before = await searchContentPages({ q: "", filter: "all" });

    const [published] = await db
      .insert(contentPages)
      .values({ slug: `/spc-published-${runId}`, title: `SPC Published ${runId}`, status: "published" })
      .returning({ id: contentPages.id });
    const [draft] = await db
      .insert(contentPages)
      .values({ slug: `/spc-draft-${runId}`, title: `SPC Draft ${runId}`, status: "draft" })
      .returning({ id: contentPages.id });
    const [system] = await db
      .insert(contentPages)
      .values({ slug: `/spc-system-${runId}`, title: `SPC System ${runId}`, status: "published", system: true })
      .returning({ id: contentPages.id });
    pageIds.push(published.id, draft.id, system.id);

    const after = await searchContentPages({ q: "", filter: "all" });
    expect(after.stats.total - before.stats.total).toBe(3);
    expect(after.stats.published - before.stats.published).toBe(2);
    expect(after.stats.draft - before.stats.draft).toBe(1);
    expect(after.stats.system - before.stats.system).toBe(1);

    const searchByTitle = await searchContentPages({ q: `SPC Published ${runId}`, filter: "all" });
    expect(searchByTitle.rows.map((row) => row.id)).toEqual([published.id]);

    const searchBySlug = await searchContentPages({ q: `spc-draft-${runId}`, filter: "all" });
    expect(searchBySlug.rows.map((row) => row.id)).toEqual([draft.id]);

    const filterDraft = await searchContentPages({ q: "", filter: "draft" });
    expect(filterDraft.rows.some((row) => row.id === published.id)).toBe(false);
    expect(filterDraft.rows.some((row) => row.id === draft.id)).toBe(true);

    const filterSystem = await searchContentPages({ q: "", filter: "system" });
    expect(filterSystem.rows.some((row) => row.id === system.id)).toBe(true);
    expect(filterSystem.rows.some((row) => row.id === published.id)).toBe(false);

    const noMatches = await searchContentPages({ q: `no-such-page-${runId}`, filter: "all" });
    expect(noMatches.rows).toEqual([]);
  });
});
