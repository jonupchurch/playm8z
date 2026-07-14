import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// requireRole is mocked directly (rather than mocking @/auth + letting
// the real requireRole run) because its rank check is currently
// hardcoded to reject every session -- no `role` column exists yet
// (require-role.ts's own comment; Admin Settings/024 adds it). Mocking
// it lets this test prove the Server Action's own toggle logic is
// correct, decoupled from that still-pending infrastructure -- exactly
// what a real moderator session will exercise once that column ships.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { toggleUserBan } = await import("./toggle-user-ban");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `toggle-ban-${runId}@example.com`;
let userId: string;

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
});

describe("toggleUserBan", () => {
  it("rejects when the role check fails (today's real behavior -- no session can pass it yet)", async () => {
    const [user] = await db
      .insert(users)
      .values({ email, handle: `toggleban${runId}` })
      .returning({ id: users.id });
    userId = user.id;

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(toggleUserBan({ userId })).rejects.toThrow();

    const [row] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId));
    expect(row.bannedAt).toBeNull();
  });

  it("bans an active user, then unbans them", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const banResult = await toggleUserBan({ userId });
    expect(banResult).toEqual({ success: true, banned: true });

    const [banned] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId));
    expect(banned.bannedAt).not.toBeNull();

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const unbanResult = await toggleUserBan({ userId });
    expect(unbanResult).toEqual({ success: true, banned: false });

    const [active] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId));
    expect(active.bannedAt).toBeNull();
  });

  it("returns an error for a nonexistent user", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await toggleUserBan({ userId: crypto.randomUUID() });
    expect(result).toEqual({ success: false, error: "User not found." });
  });

  it("rejects invalid input", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await toggleUserBan({ userId: "not-a-uuid" as never });
    expect(result.success).toBe(false);
  });
});
