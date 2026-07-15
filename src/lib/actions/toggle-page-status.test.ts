import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, contentPages, users } from "@/db/schema";

// See save-content-page.test.ts's own comment -- requireRole is mocked
// directly since its rank check currently rejects every real session.
// `@/auth` is separately mocked so requireAuth() (used to attribute
// the new logAuditEntry() call, 025's own gap fix) succeeds.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { togglePageStatus } = await import("./toggle-page-status");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const slug = `toggle-cp-${runId}`;
const moderatorEmail = `toggle-page-status-mod-${runId}@example.com`;
let moderatorId: string;
let pageId: string;

beforeAll(async () => {
  const [page] = await db
    .insert(contentPages)
    .values({ slug, title: "Toggle test page", status: "published", blocks: [] })
    .returning({ id: contentPages.id });
  pageId = page.id;

  const [moderator] = await db
    .insert(users)
    .values({ email: moderatorEmail, handle: `togglecpmod${runId}` })
    .returning({ id: users.id });
  moderatorId = moderator.id;
  mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
});

afterAll(async () => {
  await db.delete(contentPages).where(eq(contentPages.slug, slug));
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(users).where(eq(users.id, moderatorId));
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

    // FR-007 (025's own gap fix, research.md #2): this feature never
    // logged before -- now every toggle logs a content-category entry.
    const [unpublishEntry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, pageId), eq(auditEntries.action, "unpublished a content page")));
    expect(unpublishEntry.actorId).toBe(moderatorId);
    expect(unpublishEntry.category).toBe("content");

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const second = await togglePageStatus({ slug, status: "published" });
    expect(second).toEqual({ success: true });

    const [row2] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
    expect(row2.status).toBe("published");

    const [publishEntry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, pageId), eq(auditEntries.action, "published a content page")));
    expect(publishEntry.actorId).toBe(moderatorId);
  });

  it("rejects an invalid status value", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    // @ts-expect-error -- deliberately invalid input for the validation path
    const result = await togglePageStatus({ slug, status: "archived" });
    expect(result.success).toBe(false);
  });
});
