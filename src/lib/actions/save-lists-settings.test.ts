import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, settings, users } from "@/db/schema";

// The Lists tab's one save action, carrying both 030's genres and 031's
// suggested games. requireRole is mocked so this proves the action's own
// logic; the real admin/moderator gate is exercised through a seeded
// session in e2e. `@/auth` is mocked so requireAuth() can attribute the
// audit entry.
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
// originals are captured up front and restored unconditionally.
let originalGenres: string[];
let originalGames: string[];

// Both arrays are always submitted together -- it's one form.
const input = (over: { genres?: string[]; suggestedGames?: string[] } = {}) => ({
  genres: over.genres ?? originalGenres,
  suggestedGames: over.suggestedGames ?? originalGames,
});

beforeAll(async () => {
  const [admin] = await db
    .insert(users)
    .values({ email: adminEmail, handle: `savelistsadmin${runId}`, role: "admin" })
    .returning({ id: users.id });
  adminId = admin.id;
  mockedAuth.mockResolvedValue({ user: { email: adminEmail }, expires: new Date(Date.now() + 60_000).toISOString() });

  const current = await getSettings();
  originalGenres = current.genres;
  originalGames = current.suggestedGames;
});

afterAll(async () => {
  // Unconditional, not only on the success path.
  await db.update(settings).set({ genres: originalGenres, suggestedGames: originalGames });
  invalidateSettingsCache();
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.id, adminId));
});

describe("saveListsSettings", () => {
  it("rejects when the role check fails, leaving both lists unchanged", async () => {
    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(saveListsSettings(input({ genres: ["Hacked"] }))).rejects.toThrow();

    invalidateSettingsCache();
    const after = await getSettings();
    expect(after.genres).toEqual(originalGenres);
    expect(after.suggestedGames).toEqual(originalGames);
  });

  it("persists both lists and logs one attributable audit entry", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const genres = [...originalGenres, `Racing ${runId}`];
    const suggestedGames = [...originalGames, `Palworld ${runId}`];
    expect(await saveListsSettings({ genres, suggestedGames })).toEqual({ success: true });

    invalidateSettingsCache();
    const after = await getSettings();
    expect(after.genres).toEqual(genres);
    expect(after.suggestedGames).toEqual(suggestedGames);

    // One tab, one save, ONE audit entry -- not one per list.
    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe("content");
  });

  // The write must go through upsertSettings(), which is what calls
  // invalidateSettingsCache(). revalidatePath() alone doesn't touch that
  // in-memory TTL cache -- without it an admin's own save would be
  // invisible to them for up to 5 seconds.
  it("invalidates the settings cache, so a save is visible on the very next read", async () => {
    await getSettings(); // prime the cache

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const genres = [...originalGenres, `Cache Check ${runId}`];
    expect(await saveListsSettings(input({ genres }))).toEqual({ success: true });

    // Deliberately NO invalidateSettingsCache() here -- the action must
    // have done it.
    expect((await getSettings()).genres).toEqual(genres);
  });
});

describe("saveListsSettings: genres guardrails (030)", () => {
  it("refuses an empty list -- Post a Game would have nothing to offer", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect((await saveListsSettings(input({ genres: [] }))).success).toBe(false);
  });

  it("refuses a blank entry", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect((await saveListsSettings(input({ genres: ["FPS", "   "] }))).success).toBe(false);
  });

  it("refuses a case-insensitive duplicate", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect((await saveListsSettings(input({ genres: ["FPS", "fps"] }))).success).toBe(false);
  });

  // FR-014: the stored value keeps the casing the admin typed.
  it("stores mixed case and punctuation exactly as typed", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const genres = ["Co-op PvE", "TTRPG", `Hack 'n' Slash ${runId}`];
    expect(await saveListsSettings(input({ genres }))).toEqual({ success: true });

    invalidateSettingsCache();
    expect((await getSettings()).genres).toEqual(genres);
  });
});

describe("saveListsSettings: suggested games guardrails (031)", () => {
  // FR-009: load-bearing in a way the genre rule isn't -- onboarding's
  // games step has NO free-text entry, so an empty list leaves a
  // newcomer facing a step with nothing to click.
  it("refuses an empty list -- new players would have nothing to pick from", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect((await saveListsSettings(input({ suggestedGames: [] }))).success).toBe(false);
  });

  it("refuses a blank entry", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect((await saveListsSettings(input({ suggestedGames: ["CS2", "  "] }))).success).toBe(false);
  });

  it("refuses a case-insensitive duplicate", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    expect((await saveListsSettings(input({ suggestedGames: ["Valorant", "valorant"] }))).success).toBe(false);
  });

  // FR-013. These three are the real entries an over-eager sanitiser
  // mangles -- an apostrophe, an ampersand and a colon. The apostrophe
  // is not hypothetical: it broke the column's own DDL default until it
  // was escaped (see schema.ts).
  it("round-trips apostrophes, ampersands and colons exactly", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const suggestedGames = ["Baldur's Gate 3", "D&D 5e", "Magic: The Gathering", `Sid's "Game" ${runId}`];
    expect(await saveListsSettings(input({ suggestedGames }))).toEqual({ success: true });

    invalidateSettingsCache();
    expect((await getSettings()).suggestedGames).toEqual(suggestedGames);
  });
});
