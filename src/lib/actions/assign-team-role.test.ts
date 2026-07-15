import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { assignTeamRole } = await import("./assign-team-role");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `assign-role-admin-${runId}@example.com`;
const moderatorEmail = `assign-role-mod-${runId}@example.com`;
const targetEmail = `assign-role-target-${runId}@example.com`;
let adminId: string;
let targetId: string;

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.email, adminEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
  await db.delete(users).where(eq(users.email, targetEmail));
});

afterEach(() => {
  mockedAuth.mockReset();
});

describe("assignTeamRole", () => {
  it("rejects a moderator session (FR-001's admin-only gate)", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `assignrolemod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(assignTeamRole({ email: targetEmail, role: "viewer" })).rejects.toThrow();
  });

  it("assigns a role to an existing user by email and logs an audit entry (category = 'access')", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `assignroleadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    const [target] = await db.insert(users).values({ email: targetEmail, handle: `assignroletarget${runId}` }).returning({ id: users.id });
    targetId = target.id;

    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await assignTeamRole({ email: targetEmail, role: "moderator" });
    expect(result).toEqual({ success: true });

    const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId));
    expect(row.role).toBe("moderator");

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.action === "set role to moderator" && e.category === "access" && e.targetId === targetId)).toBe(true);
  });

  it("returns a clear message for an email matching no existing account", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await assignTeamRole({ email: `no-such-account-${runId}@example.com`, role: "viewer" });
    expect(result).toEqual({ success: false, error: "No account found for that email -- they need to sign up first." });
  });

  it("rejects invalid input", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await assignTeamRole({ email: "not-an-email", role: "moderator" });
    expect(result.success).toBe(false);
  });
});
