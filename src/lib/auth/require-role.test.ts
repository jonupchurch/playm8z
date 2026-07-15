import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

vi.mock("next/navigation", () => ({ forbidden: vi.fn(), unauthorized: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { forbidden, unauthorized } = await import("next/navigation");
const { auth } = await import("@/auth");
const { requireRole, getCurrentRole } = await import("./require-role");

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedForbidden = forbidden as unknown as ReturnType<typeof vi.fn>;
const mockedUnauthorized = unauthorized as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const userEmail = `role-user-${runId}@example.com`;
const supportEmail = `role-support-${runId}@example.com`;
const viewerEmail = `role-viewer-${runId}@example.com`;
const moderatorEmail = `role-moderator-${runId}@example.com`;
const adminEmail = `role-admin-${runId}@example.com`;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  await db.insert(users).values([
    { email: userEmail },
    { email: supportEmail, role: "support" },
    { email: viewerEmail, role: "viewer" },
    { email: moderatorEmail, role: "moderator" },
    { email: adminEmail, role: "admin" },
  ]);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, userEmail));
  await db.delete(users).where(eq(users.email, supportEmail));
  await db.delete(users).where(eq(users.email, viewerEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
  await db.delete(users).where(eq(users.email, adminEmail));
});

describe("requireRole", () => {
  beforeEach(() => {
    mockedForbidden.mockClear();
    mockedUnauthorized.mockClear();
  });

  it("calls unauthorized() when there is no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    await requireRole("moderator");
    expect(mockedUnauthorized).toHaveBeenCalledOnce();
    expect(mockedForbidden).not.toHaveBeenCalled();
  });

  it("calls forbidden() when a plain user's rank is below the minimum", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(userEmail));
    await requireRole("moderator");
    expect(mockedForbidden).toHaveBeenCalledOnce();
    expect(mockedUnauthorized).not.toHaveBeenCalled();
  });

  it("calls forbidden() for support/viewer at the moderator minimum -- both still denied like a plain user", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(supportEmail));
    await requireRole("moderator");
    expect(mockedForbidden).toHaveBeenCalledOnce();

    mockedForbidden.mockClear();
    mockedAuth.mockResolvedValueOnce(fakeSession(viewerEmail));
    await requireRole("moderator");
    expect(mockedForbidden).toHaveBeenCalledOnce();
  });

  it("returns normally for a moderator at the moderator minimum", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    await requireRole("moderator");
    expect(mockedForbidden).not.toHaveBeenCalled();
    expect(mockedUnauthorized).not.toHaveBeenCalled();
  });

  it("calls forbidden() for a moderator at the admin minimum -- this feature's own stricter gate", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    await requireRole("admin");
    expect(mockedForbidden).toHaveBeenCalledOnce();
  });

  it("returns normally for an admin at the admin minimum", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(adminEmail));
    await requireRole("admin");
    expect(mockedForbidden).not.toHaveBeenCalled();
    expect(mockedUnauthorized).not.toHaveBeenCalled();
  });

  it("returns normally when the minimum is 'user' (every account's own rank or higher)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(userEmail));
    await requireRole("user");
    expect(mockedForbidden).not.toHaveBeenCalled();
    expect(mockedUnauthorized).not.toHaveBeenCalled();
  });
});

describe("getCurrentRole", () => {
  it("returns null when there is no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    expect(await getCurrentRole()).toBeNull();
  });

  it("returns the session user's real role", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(adminEmail));
    expect(await getCurrentRole()).toBe("admin");
  });
});
