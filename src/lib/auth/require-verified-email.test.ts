import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { requireVerifiedEmail, UnverifiedEmailError } = await import("./require-verified-email");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `gate-verified-${runId}@example.com`;
const unverifiedEmail = `gate-unverified-${runId}@example.com`;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  await db.insert(users).values([
    { email: verifiedEmail, emailVerified: new Date() },
    { email: unverifiedEmail },
  ]);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("requireVerifiedEmail", () => {
  it("resolves for a verified user", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await requireVerifiedEmail();
    expect(result.email).toBe(verifiedEmail);
  });

  it("throws UnverifiedEmailError for an unverified user", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    await expect(requireVerifiedEmail()).rejects.toThrow(UnverifiedEmailError);
  });

  it("throws when there is no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    await expect(requireVerifiedEmail()).rejects.toThrow();
  });
});
