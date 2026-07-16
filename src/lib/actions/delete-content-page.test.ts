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
const { deleteContentPage } = await import("./delete-content-page");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const customSlug = `delete-cp-custom-${runId}`;
const draftSlug = `delete-cp-draft-${runId}`;
const systemSlug = `delete-cp-system-${runId}`;
const moderatorEmail = `delete-content-page-mod-${runId}@example.com`;
let customId: string;
let draftId: string;
let systemId: string;
let moderatorId: string;

beforeAll(async () => {
  const [custom] = await db
    .insert(contentPages)
    .values({ slug: customSlug, title: "Custom page", status: "published", system: false })
    .returning({ id: contentPages.id });
  customId = custom.id;

  const [draft] = await db
    .insert(contentPages)
    .values({ slug: draftSlug, title: "Draft page", status: "draft", system: false })
    .returning({ id: contentPages.id });
  draftId = draft.id;

  const [system] = await db
    .insert(contentPages)
    .values({ slug: systemSlug, title: "System page", status: "published", system: true })
    .returning({ id: contentPages.id });
  systemId = system.id;

  const [moderator] = await db
    .insert(users)
    .values({ email: moderatorEmail, handle: `deletecpmod${runId}` })
    .returning({ id: users.id });
  moderatorId = moderator.id;
  mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
});

afterAll(async () => {
  await db.delete(contentPages).where(eq(contentPages.slug, customSlug));
  await db.delete(contentPages).where(eq(contentPages.slug, draftSlug));
  await db.delete(contentPages).where(eq(contentPages.slug, systemSlug));
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(users).where(eq(users.id, moderatorId));
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

  it("removes the row outright for a custom page (ADR 0005's 2026-07-16 amendment)", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await deleteContentPage({ pageId: customId });
    expect(result).toEqual({ success: true });

    const rows = await db.select().from(contentPages).where(eq(contentPages.id, customId));
    expect(rows).toHaveLength(0);

    // The amendment's core claim: auditEntries denormalises targetLabel
    // rather than holding a foreign key, so the record of the deletion
    // outlives the page it describes. If this ever regressed to a real
    // FK, the delete above would throw instead.
    const [entry] = await db.select().from(auditEntries).where(eq(auditEntries.targetId, customId));
    expect(entry.actorId).toBe(moderatorId);
    expect(entry.action).toBe("deleted a content page");
    expect(entry.category).toBe("content");
    expect(entry.targetLabel).toBe("Custom page");
  });

  // The reported bug: Delete used to set status='draft', so on a page
  // that was already a draft it changed nothing at all and reported
  // success -- junk drafts could never be cleared.
  it("removes an already-draft page rather than silently no-opping", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await deleteContentPage({ pageId: draftId });
    expect(result).toEqual({ success: true });

    const rows = await db.select().from(contentPages).where(eq(contentPages.id, draftId));
    expect(rows).toHaveLength(0);
  });

  it("rejects a system page target, leaving the row intact", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await deleteContentPage({ pageId: systemId });
    expect(result.success).toBe(false);

    const rows = await db.select().from(contentPages).where(eq(contentPages.id, systemId));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("published");
  });

  it("rejects an invalid pageId", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await deleteContentPage({ pageId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
