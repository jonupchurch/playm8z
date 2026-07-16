import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";

// requireRole is mocked directly (rather than mocking @/auth + letting
// the real requireRole run) so this test proves the Server Action's own
// persistence logic, decoupled from the role plumbing Admin Settings
// (024) shipped -- which admin-content-pages.spec.ts exercises for real
// through a seeded admin session.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { saveContentPage } = await import("./save-content-page");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const slug = `save-cp-${runId}`;
// Renames are exercised on their own rows so they can't reorder-couple
// with the title/blocks tests above them.
const renameFrom = `save-cp-rename-${runId}`;
const renameTo = `save-cp-renamed-${runId}`;
const occupiedSlug = `save-cp-occupied-${runId}`;
const systemSlug = `save-cp-system-${runId}`;

// Cleanup is keyed on id, not slug: these tests rename pages by design,
// so a slug-keyed afterAll can miss a row that moved -- which is exactly
// how an earlier draft stranded a "house-rules" row in the shared dev
// database.
let createdIds: string[] = [];

beforeAll(async () => {
  createdIds = (
    await db
      .insert(contentPages)
      .values([
        { slug, title: "Original title", status: "draft", blocks: [{ type: "p", text: "Original body" }] },
        { slug: renameFrom, title: "Rename me", status: "draft", blocks: [] },
        { slug: occupiedSlug, title: "Occupied", status: "draft", blocks: [] },
        { slug: systemSlug, title: "System page", status: "published", system: true, blocks: [] },
      ])
      .returning({ id: contentPages.id })
  ).map((row) => row.id);
});

afterAll(async () => {
  await db.delete(contentPages).where(inArray(contentPages.id, createdIds));
});

describe("saveContentPage", () => {
  it("rejects when the role check fails", async () => {
    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(saveContentPage(slug, { title: "New title", slug, blocks: [] })).rejects.toThrow();

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row.title).toBe("Original title");
  });

  it("persists the whole title + blocks array atomically once the role check passes", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(slug, {
      title: "Updated title",
      slug,
      blocks: [
        { type: "h2", text: "New heading" },
        { type: "list", items: ["a", "b"] },
      ],
    });
    expect(result).toEqual({ success: true, slug });

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row.title).toBe("Updated title");
    expect(row.blocks).toEqual([
      { type: "h2", text: "New heading" },
      { type: "list", items: ["a", "b"] },
    ]);
  });

  it("rejects invalid input without persisting anything", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(slug, { title: "", slug, blocks: [] });
    expect(result.success).toBe(false);

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row.title).toBe("Updated title");
  });

  // The reported bug: there was no way to change a page's URL at all, so
  // every custom page was stuck on the "untitled-page" slug that
  // createContentPage generated.
  it("renames the slug, moving the page to its new URL", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(renameFrom, { title: "Renamed", slug: renameTo, blocks: [] });
    expect(result).toEqual({ success: true, slug: renameTo });

    expect(await db.select().from(contentPages).where(eq(contentPages.slug, renameFrom))).toHaveLength(0);
    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, renameTo));
    expect(row.title).toBe("Renamed");
  });

  it("rejects a slug already taken by another page", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(renameTo, { title: "Renamed", slug: occupiedSlug, blocks: [] });
    expect(result).toEqual({ success: false, error: "That URL is already taken." });

    // The occupant is untouched, and the page kept its own slug.
    const [occupant] = await db.select().from(contentPages).where(eq(contentPages.slug, occupiedSlug));
    expect(occupant.title).toBe("Occupied");
    expect(await db.select().from(contentPages).where(eq(contentPages.slug, renameTo))).toHaveLength(1);
  });

  it("accepts a save that keeps the page's own slug, which is not a collision with itself", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(renameTo, { title: "Still here", slug: renameTo, blocks: [] });
    expect(result).toEqual({ success: true, slug: renameTo });
  });

  // Uppercase is deliberately absent: the schema lowercases as a
  // transform, so "House-Rules" is normalised to "house-rules" and
  // accepted, not rejected (content-page.test.ts pins that directly).
  // An earlier draft of this test wrongly listed it here and thereby
  // renamed the page for real on its first run, leaking a stray
  // "house-rules" row -- after which the case passed for entirely the
  // wrong reason ("That URL is already taken") on every later run.
  it.each([
    ["a leading slash", "/house-rules"],
    ["spaces", "house rules"],
    ["a path separator", "house/rules"],
    ["a trailing hyphen", "house-rules-"],
    ["a double hyphen", "house--rules"],
    ["emptiness", ""],
  ])("rejects %s in a slug", async (_label, badSlug) => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(renameTo, { title: "Still here", slug: badSlug, blocks: [] });
    expect(result.success).toBe(false);

    expect(await db.select().from(contentPages).where(eq(contentPages.slug, renameTo))).toHaveLength(1);
  });

  it("normalises rather than rejects an uppercase slug", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const upper = `SAVE-CP-Upper-${runId}`;
    const result = await saveContentPage(renameTo, { title: "Still here", slug: upper, blocks: [] });
    expect(result).toEqual({ success: true, slug: upper.toLowerCase() });

    // Renamed, so put it back for the tests that follow.
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect(await saveContentPage(upper.toLowerCase(), { title: "Still here", slug: renameTo, blocks: [] })).toEqual({
      success: true,
      slug: renameTo,
    });
  });

  it("refuses to move a system page, whose slug the nav and footer hardcode", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(systemSlug, { title: "System page", slug: `moved-${runId}`, blocks: [] });
    expect(result).toEqual({ success: false, error: "A system page's URL can't be changed." });

    expect(await db.select().from(contentPages).where(eq(contentPages.slug, systemSlug))).toHaveLength(1);
  });

  it("still lets a system page's title and blocks be edited, just not its slug", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(systemSlug, {
      title: "System page, edited",
      slug: systemSlug,
      blocks: [{ type: "p", text: "Edited body" }],
    });
    expect(result).toEqual({ success: true, slug: systemSlug });

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, systemSlug));
    expect(row.title).toBe("System page, edited");
  });

  it("reports a missing page rather than throwing", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(`no-such-page-${runId}`, { title: "x", slug: `whatever-${runId}`, blocks: [] });
    expect(result).toEqual({ success: false, error: "Page not found." });
  });
});
