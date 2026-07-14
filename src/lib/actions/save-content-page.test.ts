import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";

// requireRole is mocked directly (rather than mocking @/auth + letting
// the real requireRole run) because its rank check is currently
// hardcoded to reject every session -- no `role` column exists yet
// (require-role.ts's own comment; Admin Settings/024 adds it). Mocking
// it lets this test prove the Server Action's own persistence logic is
// correct, decoupled from that still-pending infrastructure -- exactly
// what a real moderator session will exercise once that column ships.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { saveContentPage } = await import("./save-content-page");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const slug = `save-cp-${runId}`;

beforeAll(async () => {
  await db.insert(contentPages).values({
    slug,
    title: "Original title",
    status: "draft",
    blocks: [{ type: "p", text: "Original body" }],
  });
});

afterAll(async () => {
  await db.delete(contentPages).where(eq(contentPages.slug, slug));
});

describe("saveContentPage", () => {
  it("rejects when the role check fails (today's real behavior -- no session can pass it yet)", async () => {
    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(saveContentPage(slug, { title: "New title", blocks: [] })).rejects.toThrow();

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row.title).toBe("Original title");
  });

  it("persists the whole title + blocks array atomically once the role check passes", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(slug, {
      title: "Updated title",
      blocks: [
        { type: "h2", text: "New heading" },
        { type: "list", items: ["a", "b"] },
      ],
    });
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row.title).toBe("Updated title");
    expect(row.blocks).toEqual([
      { type: "h2", text: "New heading" },
      { type: "list", items: ["a", "b"] },
    ]);
  });

  it("rejects invalid input without persisting anything", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveContentPage(slug, { title: "", blocks: [] });
    expect(result.success).toBe(false);

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row.title).toBe("Updated title");
  });
});
