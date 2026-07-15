import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, settings, users } from "@/db/schema";
import { invalidateSettingsCache } from "@/lib/settings/get-settings";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { saveModerationSettings } = await import("./save-moderation-settings");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `save-mod-admin-${runId}@example.com`;
const moderatorEmail = `save-mod-mod-${runId}@example.com`;
let adminId: string;

const validInput = {
  phraseFilterEnabled: false,
  linkFilterEnabled: true,
  boostFilterEnabled: true,
  newAccountReviewEnabled: false,
  bannedPhrases: ["scam-phrase"],
  autoHideEnabled: true,
  autoHideThreshold: 5,
  autoEscalateSeverity: "med" as const,
};

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.email, adminEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
  // This test's own validInput disables the phrase filter and enables
  // auto-hide -- reset every touched field back to its schema default
  // so no other file's own moderation-dependent test inherits this
  // state (this project's own single-worker/sequential Vitest run
  // still shares one real Postgres database across every test file).
  const [row] = await db.select().from(settings).limit(1);
  if (row) {
    await db
      .update(settings)
      .set({
        phraseFilterEnabled: true,
        linkFilterEnabled: true,
        boostFilterEnabled: true,
        newAccountReviewEnabled: true,
        bannedPhrases: ["free nitro", "cheap boosting", "click here", "dm for rates", "gift-nitro"],
        autoHideEnabled: false,
        autoHideThreshold: 3,
        autoEscalateSeverity: "high",
      })
      .where(eq(settings.id, row.id));
  }
  invalidateSettingsCache();
});

afterEach(() => {
  mockedAuth.mockReset();
});

describe("saveModerationSettings", () => {
  it("rejects a moderator session (FR-001's admin-only gate)", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `savemodmod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(saveModerationSettings(validInput)).rejects.toThrow();
  });

  it("persists every moderation field for an admin session and logs an audit entry", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `savemodadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const result = await saveModerationSettings(validInput);
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(settings).limit(1);
    expect(row.phraseFilterEnabled).toBe(false);
    expect(row.newAccountReviewEnabled).toBe(false);
    expect(row.bannedPhrases).toEqual(["scam-phrase"]);
    expect(row.autoHideEnabled).toBe(true);
    expect(row.autoHideThreshold).toBe(5);
    expect(row.autoEscalateSeverity).toBe("med");

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.action === "updated moderation & auto-flag settings" && e.category === "moderation")).toBe(true);
  });

  it("rejects an out-of-range threshold", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await saveModerationSettings({ ...validInput, autoHideThreshold: 99 });
    expect(result.success).toBe(false);
  });
});
