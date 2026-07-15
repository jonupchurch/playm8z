import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, settings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { saveSafetySettings } = await import("./save-safety-settings");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `save-safety-admin-${runId}@example.com`;
const moderatorEmail = `save-safety-mod-${runId}@example.com`;
let adminId: string;

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.email, adminEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
  const [row] = await db.select().from(settings).limit(1);
  if (row) await db.update(settings).set({ discoverableByDefault: true }).where(eq(settings.id, row.id));
});

afterEach(() => {
  mockedAuth.mockReset();
});

describe("saveSafetySettings", () => {
  it("rejects a moderator session (FR-001's admin-only gate)", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `savesafetymod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(saveSafetySettings({ discoverableByDefault: false })).rejects.toThrow();
  });

  it("persists discoverableByDefault for an admin session and logs an audit entry", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `savesafetyadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const result = await saveSafetySettings({ discoverableByDefault: false });
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(settings).limit(1);
    expect(row.discoverableByDefault).toBe(false);

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.action === "updated safety settings")).toBe(true);
  });

  it("rejects a non-boolean", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await saveSafetySettings({ discoverableByDefault: "yes" } as never);
    expect(result.success).toBe(false);
  });
});
