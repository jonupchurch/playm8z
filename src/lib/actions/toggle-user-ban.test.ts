import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";

// requireRole is mocked directly (rather than mocking @/auth + letting
// the real requireRole run) because its rank check is currently
// hardcoded to reject every session -- no `role` column exists yet
// (require-role.ts's own comment; Admin Settings/024 adds it). Mocking
// it lets this test prove the Server Action's own toggle logic is
// correct, decoupled from that still-pending infrastructure -- exactly
// what a real moderator session will exercise once that column ships.
// `@/auth` is separately mocked so requireAuth() (used to attribute
// the new Admin Postings 017 audit-log write to a real moderator row)
// succeeds with a real user.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { toggleUserBan } = await import("./toggle-user-ban");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const email = `toggle-ban-${runId}@example.com`;
const moderatorEmail = `toggle-ban-mod-${runId}@example.com`;
let userId: string;
let moderatorId: string;

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, moderatorId));
});

describe("toggleUserBan", () => {
  it("rejects when the role check fails (today's real behavior -- no session can pass it yet)", async () => {
    const [user] = await db
      .insert(users)
      .values({ email, handle: `toggleban${runId}` })
      .returning({ id: users.id });
    userId = user.id;

    const [moderator] = await db
      .insert(users)
      .values({ email: moderatorEmail, handle: `togglebanmod${runId}` })
      .returning({ id: users.id });
    moderatorId = moderator.id;

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(toggleUserBan({ userId })).rejects.toThrow();

    const [row] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId));
    expect(row.bannedAt).toBeNull();
  });

  it("bans an active user, then unbans them, logging an audit entry each time", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const banResult = await toggleUserBan({ userId });
    expect(banResult).toEqual({ success: true, banned: true });

    const [banned] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId));
    expect(banned.bannedAt).not.toBeNull();

    const [banEntry] = await db
      .select()
      .from(auditEntries)
      .where(eq(auditEntries.targetId, userId));
    expect(banEntry.action).toBe("banned a user");
    expect(banEntry.actorId).toBe(moderatorId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const unbanResult = await toggleUserBan({ userId });
    expect(unbanResult).toEqual({ success: true, banned: false });

    const [active] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId));
    expect(active.bannedAt).toBeNull();

    const unbanEntries = await db.select().from(auditEntries).where(eq(auditEntries.targetId, userId));
    expect(unbanEntries.some((e) => e.action === "unbanned a user")).toBe(true);
  });

  it("returns an error for a nonexistent user", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await toggleUserBan({ userId: crypto.randomUUID() });
    expect(result).toEqual({ success: false, error: "User not found." });
  });

  it("rejects invalid input", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await toggleUserBan({ userId: "not-a-uuid" as never });
    expect(result.success).toBe(false);
  });
});
