import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { removeTeamMember } = await import("./remove-team-member");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `remove-member-admin-${runId}@example.com`;
const moderatorEmail = `remove-member-mod-${runId}@example.com`;
const targetEmail = `remove-member-target-${runId}@example.com`;
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

describe("removeTeamMember", () => {
  it("rejects a moderator session (FR-001's admin-only gate)", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `removemembermod${runId}`, role: "moderator" });
    const [target] = await db.insert(users).values({ email: targetEmail, handle: `removemembertarget${runId}`, role: "moderator" }).returning({ id: users.id });
    targetId = target.id;
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(removeTeamMember({ userId: targetId })).rejects.toThrow();
  });

  it("reverts a team member's role to 'user' -- never a ban or deletion (ADR 0005)", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `removememberadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const result = await removeTeamMember({ userId: targetId });
    expect(result).toEqual({ success: true });

    const [row] = await db.select({ role: users.role, bannedAt: users.bannedAt }).from(users).where(eq(users.id, targetId));
    expect(row.role).toBe("user");
    expect(row.bannedAt).toBeNull();

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.category === "access" && e.targetId === targetId)).toBe(true);
  });

  it("returns an error for a nonexistent user", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await removeTeamMember({ userId: crypto.randomUUID() });
    expect(result).toEqual({ success: false, error: "User not found." });
  });

  it("rejects invalid input", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    const result = await removeTeamMember({ userId: "not-a-uuid" as never });
    expect(result.success).toBe(false);
  });
});
