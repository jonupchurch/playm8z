import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, settings, users } from "@/db/schema";
import { invalidateSettingsCache } from "@/lib/settings/get-settings";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { saveFeatureFlags } = await import("./save-feature-flags");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `save-flags-admin-${runId}@example.com`;
const moderatorEmail = `save-flags-mod-${runId}@example.com`;
let adminId: string;

const validInput = {
  discordFlag: true,
  groupsFlag: true,
  ratingsFlag: true,
  forumFlag: false,
  tabletopFlag: false,
  openSignups: false,
};

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.email, adminEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
  // This test's own validInput sets openSignups: false -- reset it so
  // no other file's own real sign-up test inherits a closed platform
  // (this project's own single-worker/sequential Vitest run still
  // shares one real Postgres database across every test file).
  const [row] = await db.select().from(settings).limit(1);
  if (row) await db.update(settings).set({ openSignups: true }).where(eq(settings.id, row.id));
  invalidateSettingsCache();
});

afterEach(() => {
  mockedAuth.mockReset();
});

describe("saveFeatureFlags", () => {
  it("rejects a moderator session (FR-001's admin-only gate)", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `saveflagsmod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(saveFeatureFlags(validInput)).rejects.toThrow();
  });

  it("persists all six flags for an admin session and logs an audit entry", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `saveflagsadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const result = await saveFeatureFlags(validInput);
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(settings).limit(1);
    expect(row.discordFlag).toBe(true);
    expect(row.groupsFlag).toBe(true);
    expect(row.ratingsFlag).toBe(true);
    expect(row.forumFlag).toBe(false);
    expect(row.tabletopFlag).toBe(false);
    expect(row.openSignups).toBe(false);

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.action === "updated feature flags")).toBe(true);
  });

  it("rejects a missing field", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await saveFeatureFlags({ discordFlag: false } as never);
    expect(result.success).toBe(false);
  });
});
