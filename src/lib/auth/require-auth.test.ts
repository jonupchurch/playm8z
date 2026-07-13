import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { requireAuth } = await import("./require-auth");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `require-auth-${runId}@example.com`;

function fakeSession(sessionEmail: string) {
  return { user: { email: sessionEmail }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  await db.insert(users).values({ email, handle: `requireauth${runId}` });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

describe("requireAuth", () => {
  it("resolves for any authenticated session, verified or not", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    const result = await requireAuth();
    expect(result.email).toBe(email);
  });

  it("throws when there is no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    await expect(requireAuth()).rejects.toThrow();
  });

  it("throws when the session's email doesn't match a real user", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(`ghost-${runId}@example.com`));
    await expect(requireAuth()).rejects.toThrow();
  });
});
