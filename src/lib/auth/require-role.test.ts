import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ forbidden: vi.fn(), unauthorized: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { forbidden, unauthorized } = await import("next/navigation");
const { auth } = await import("@/auth");
const { requireRole } = await import("./require-role");

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedForbidden = forbidden as unknown as ReturnType<typeof vi.fn>;
const mockedUnauthorized = unauthorized as unknown as ReturnType<typeof vi.fn>;

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

  it("calls forbidden() when a session exists but its rank is below the minimum", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { email: "player@example.com" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    });
    await requireRole("moderator");
    expect(mockedForbidden).toHaveBeenCalledOnce();
    expect(mockedUnauthorized).not.toHaveBeenCalled();
  });

  it("returns normally when the minimum is 'user' (every account's current rank)", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { email: "player@example.com" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    });
    await requireRole("user");
    expect(mockedForbidden).not.toHaveBeenCalled();
    expect(mockedUnauthorized).not.toHaveBeenCalled();
  });
});
