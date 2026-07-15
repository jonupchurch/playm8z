import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
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
const { createContentPage } = await import("./create-content-page");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `create-content-page-mod-${runId}@example.com`;
let moderatorId: string;

describe("createContentPage", () => {
  const createdSlugs: string[] = [];

  beforeAll(async () => {
    const [moderator] = await db
      .insert(users)
      .values({ email: moderatorEmail, handle: `createcpmod${runId}` })
      .returning({ id: users.id });
    moderatorId = moderator.id;
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
  });

  afterAll(async () => {
    for (const slug of createdSlugs) await db.delete(contentPages).where(eq(contentPages.slug, slug));
    await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
    await db.delete(users).where(eq(users.id, moderatorId));
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

    // FR-007 (025's own gap fix, research.md #2): this feature never
    // logged before -- now every create logs a content-category entry.
    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(eq(auditEntries.targetId, row.id));
    expect(entry.actorId).toBe(moderatorId);
    expect(entry.action).toBe("created a content page");
    expect(entry.category).toBe("content");
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
