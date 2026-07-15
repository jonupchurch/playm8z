import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";

// See save-content-page.test.ts's own comment -- requireRole is mocked
// directly since its rank check currently rejects every real session.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { createContentPage } = await import("./create-content-page");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

describe("createContentPage", () => {
  const createdSlugs: string[] = [];

  afterAll(async () => {
    for (const slug of createdSlugs) await db.delete(contentPages).where(eq(contentPages.slug, slug));
  });

  it("rejects when the role check fails (today's real behavior)", async () => {
    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(createContentPage()).rejects.toThrow();
  });

  it("creates a draft 'Untitled page' with system=false once the role check passes", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await createContentPage();
    expect(result.success).toBe(true);
    if (!result.success) return;
    createdSlugs.push(result.slug);

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, result.slug));
    expect(row.title).toBe("Untitled page");
    expect(row.status).toBe("draft");
    expect(row.system).toBe(false);
  });

  it("appends an incrementing numeric suffix when the base slug is already taken (research.md #4)", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const first = await createContentPage();
    expect(first.success).toBe(true);
    if (!first.success) return;
    createdSlugs.push(first.slug);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const second = await createContentPage();
    expect(second.success).toBe(true);
    if (!second.success) return;
    createdSlugs.push(second.slug);

    expect(second.slug).not.toBe(first.slug);
    expect(new Set(createdSlugs).size).toBe(createdSlugs.length);
  });
});
