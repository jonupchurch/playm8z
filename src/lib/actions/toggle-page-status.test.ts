import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";

// See save-content-page.test.ts's own comment -- requireRole is mocked
// directly since its rank check currently rejects every real session.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { togglePageStatus } = await import("./toggle-page-status");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const slug = `toggle-cp-${runId}`;

beforeAll(async () => {
  await db.insert(contentPages).values({ slug, title: "Toggle test page", status: "published", blocks: [] });
});

afterAll(async () => {
  await db.delete(contentPages).where(eq(contentPages.slug, slug));
});

describe("togglePageStatus", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(togglePageStatus({ slug, status: "draft" })).rejects.toThrow();

    const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row.status).toBe("published");
  });

  it("toggles published -> draft -> published once the role check passes", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const first = await togglePageStatus({ slug, status: "draft" });
    expect(first).toEqual({ success: true });

    const [row1] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row1.status).toBe("draft");

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const second = await togglePageStatus({ slug, status: "published" });
    expect(second).toEqual({ success: true });

    const [row2] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row2.status).toBe("published");
  });

  it("rejects an invalid status value", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    // @ts-expect-error -- deliberately invalid input for the validation path
    const result = await togglePageStatus({ slug, status: "archived" });
    expect(result.success).toBe(false);
  });
});
