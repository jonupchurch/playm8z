import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, settings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { saveGeneralSettings } = await import("./save-general-settings");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `save-general-admin-${runId}@example.com`;
const moderatorEmail = `save-general-mod-${runId}@example.com`;
let adminId: string;

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.email, adminEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
});

afterEach(() => {
  mockedAuth.mockReset();
});

describe("saveGeneralSettings", () => {
  it("rejects a moderator session (FR-001's admin-only gate)", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `savegenmod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(
      saveGeneralSettings({ siteName: "playm8z", tagline: "", supportEmail: "", defaultTheme: "dark" }),
    ).rejects.toThrow();
  });

  it("persists general settings for an admin session and logs an audit entry", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `savegenadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const result = await saveGeneralSettings({
      siteName: `Renamed ${runId}`,
      tagline: "New tagline",
      supportEmail: "support@example.com",
      defaultTheme: "light",
    });
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(settings).limit(1);
    expect(row.siteName).toBe(`Renamed ${runId}`);
    expect(row.tagline).toBe("New tagline");
    expect(row.supportEmail).toBe("support@example.com");
    expect(row.defaultTheme).toBe("light");

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.action === "updated general settings")).toBe(true);
  });

  it("stores an empty tagline/support email as null", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    await saveGeneralSettings({ siteName: "playm8z", tagline: "", supportEmail: "", defaultTheme: "dark" });

    const [row] = await db.select().from(settings).limit(1);
    expect(row.tagline).toBeNull();
    expect(row.supportEmail).toBeNull();
  });

  it("rejects invalid input", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await saveGeneralSettings({ siteName: "", defaultTheme: "dark" } as never);
    expect(result.success).toBe(false);
  });
});
