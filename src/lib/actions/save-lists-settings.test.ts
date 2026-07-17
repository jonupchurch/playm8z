import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, settings, users } from "@/db/schema";

// requireRole is mocked so this proves the action's own logic; the real
// admin/moderator gate is exercised for real through a seeded session in
// e2e/admin-genres.spec.ts. `@/auth` is mocked so requireAuth() can
// attribute the audit entry.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { saveListsSettings } = await import("./save-lists-settings");
const { getSettings, invalidateSettingsCache } = await import("@/lib/settings/get-settings");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `save-lists-admin-${runId}@example.com`;
let adminId: string;
// `settings` is a SHARED SINGLETON ROW. Whatever this file does to it
// leaks into whichever test file runs next unless it's put back, so the
// original is captured up front and restored unconditionally.
let originalGenres: string[];

beforeAll(async () => {
  const [admin] = await db
    .insert(users)
    .values({ email: adminEmail, handle: `savelistsadmin${runId}`, role: "admin" })
    .returning({ id: users.id });
  adminId = admin.id;
  mockedAuth.mockResolvedValue({ user: { email: adminEmail }, expires: new Date(Date.now() + 60_000).toISOString() });

  originalGenres = (await getSettings()).genres;
});

afterAll(async () => {
  // Unconditional, not only on the success path.
  await db.update(settings).set({ genres: originalGenres });
  invalidateSettingsCache();
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.id, adminId));
});

describe("saveListsSettings", () => {
  it("rejects when the role check fails, leaving the list unchanged", async () => {
    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(saveListsSettings({ genres: ["Hacked"] })).rejects.toThrow();

    invalidateSettingsCache();
    expect((await getSettings()).genres).toEqual(originalGenres);
  });

  it("persists the list and logs an attributable audit entry", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const next = [...originalGenres, `Racing ${runId}`];
    expect(await saveListsSettings({ genres: next })).toEqual({ success: true });

    invalidateSettingsCache();
    expect((await getSettings()).genres).toEqual(next);

    const [entry] = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entry.action).toBe("updated the genre list");
    expect(entry.category).toBe("content");
  });

  // FR-010: Post a Game would have nothing to offer.
  it("refuses an empty list", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveListsSettings({ genres: [] });
    expect(result.success).toBe(false);
  });

  it("refuses a blank entry", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect((await saveListsSettings({ genres: ["FPS", "   "] })).success).toBe(false);
  });

  // FR-011: duplicates are compared case-insensitively...
  it("refuses a case-insensitive duplicate", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect((await saveListsSettings({ genres: ["FPS", "fps"] })).success).toBe(false);
  });

  // ...but FR-014: the stored value keeps the casing the admin typed.
  // "Co-op PvE" and "TTRPG" are real entries -- normalising case would
  // mangle them.
  it("stores mixed case and punctuation exactly as typed", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const next = ["Co-op PvE", "TTRPG", `Hack 'n' Slash ${runId}`];
    expect(await saveListsSettings({ genres: next })).toEqual({ success: true });

    invalidateSettingsCache();
    expect((await getSettings()).genres).toEqual(next);
  });

  // The write must go through upsertSettings(), which is what calls
  // invalidateSettingsCache(). revalidatePath() alone doesn't touch that
  // in-memory TTL cache -- without it an admin's own save would be
  // invisible to them for up to 5 seconds.
  it("invalidates the settings cache, so a save is visible on the very next read", async () => {
    await getSettings(); // prime the cache

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const next = [...originalGenres, `Cache Check ${runId}`];
    expect(await saveListsSettings({ genres: next })).toEqual({ success: true });

    // Deliberately NO invalidateSettingsCache() here -- the action must
    // have done it.
    expect((await getSettings()).genres).toEqual(next);
  });
});
