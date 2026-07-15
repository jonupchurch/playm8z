import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, settings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { toggleMaintenanceMode } = await import("./toggle-maintenance-mode");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `toggle-maint-admin-${runId}@example.com`;
const moderatorEmail = `toggle-maint-mod-${runId}@example.com`;
let adminId: string;

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.email, adminEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
  const [row] = await db.select().from(settings).limit(1);
  if (row) await db.update(settings).set({ maintenanceMode: false, maintenanceMessage: null }).where(eq(settings.id, row.id));
});

afterEach(() => {
  mockedAuth.mockReset();
});

describe("toggleMaintenanceMode", () => {
  it("rejects a moderator session -- this feature's own stricter admin-only gate (FR-001)", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `toggmaintmod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(toggleMaintenanceMode({ maintenanceMode: true })).rejects.toThrow();
  });

  it("toggles maintenance mode on/off for an admin session, logging an audit entry each time (FR-003)", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `toggmaintadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const onResult = await toggleMaintenanceMode({ maintenanceMode: true, maintenanceMessage: "Back soon" });
    expect(onResult).toEqual({ success: true });

    const [rowOn] = await db.select().from(settings).limit(1);
    expect(rowOn.maintenanceMode).toBe(true);
    expect(rowOn.maintenanceMessage).toBe("Back soon");

    const onEntries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(onEntries.some((e) => e.action === "enabled maintenance mode")).toBe(true);

    const offResult = await toggleMaintenanceMode({ maintenanceMode: false });
    expect(offResult).toEqual({ success: true });

    const [rowOff] = await db.select().from(settings).limit(1);
    expect(rowOff.maintenanceMode).toBe(false);

    const offEntries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(offEntries.some((e) => e.action === "disabled maintenance mode")).toBe(true);
  });

  it("rejects invalid input", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await toggleMaintenanceMode({ maintenanceMode: "yes" as never });
    expect(result.success).toBe(false);
  });
});
