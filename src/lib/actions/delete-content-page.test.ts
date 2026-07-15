import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";

// See save-content-page.test.ts's own comment -- requireRole is mocked
// directly since its rank check currently rejects every real session.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { deleteContentPage } = await import("./delete-content-page");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const customSlug = `delete-cp-custom-${runId}`;
const systemSlug = `delete-cp-system-${runId}`;
let customId: string;
let systemId: string;

beforeAll(async () => {
  const [custom] = await db
    .insert(contentPages)
    .values({ slug: customSlug, title: "Custom page", status: "published", system: false })
    .returning({ id: contentPages.id });
  customId = custom.id;

  const [system] = await db
    .insert(contentPages)
    .values({ slug: systemSlug, title: "System page", status: "published", system: true })
    .returning({ id: contentPages.id });
  systemId = system.id;
});

afterAll(async () => {
  await db.delete(contentPages).where(eq(contentPages.slug, customSlug));
  await db.delete(contentPages).where(eq(contentPages.slug, systemSlug));
});

describe("deleteContentPage", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(deleteContentPage({ pageId: customId })).rejects.toThrow();

    const [row] = await db.select().from(contentPages).where(eq(contentPages.id, customId));
    expect(row.status).toBe("published");
  });

  it("sets status to draft for a custom page, never removing the row", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await deleteContentPage({ pageId: customId });
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(contentPages).where(eq(contentPages.id, customId));
    expect(row).toBeDefined();
    expect(row.status).toBe("draft");
  });

  it("rejects a system page target, leaving its status unchanged", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await deleteContentPage({ pageId: systemId });
    expect(result.success).toBe(false);

    const [row] = await db.select().from(contentPages).where(eq(contentPages.id, systemId));
    expect(row.status).toBe("published");
  });

  it("rejects an invalid pageId", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await deleteContentPage({ pageId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
