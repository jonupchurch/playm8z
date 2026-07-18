import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/email/send-verification-email", () => ({ sendVerificationEmail: vi.fn() }));
const { auth } = await import("@/auth");
const { sendVerificationEmail } = await import("@/lib/email/send-verification-email");
const { updateEmail } = await import("./update-email");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedSend = sendVerificationEmail as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const originalEmail = `update-email-${runId}@example.com`;
const newEmail = `update-email-new-${runId}@example.com`;
const takenEmail = `update-email-taken-${runId}@example.com`;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  await db.insert(users).values([
    { email: originalEmail, handle: `updateemail${runId}`, emailVerified: new Date() },
    { email: takenEmail, handle: `updateemailtaken${runId}` },
  ]);
});

afterAll(async () => {
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, newEmail));
  await db.delete(users).where(eq(users.email, originalEmail));
  await db.delete(users).where(eq(users.email, newEmail));
  await db.delete(users).where(eq(users.email, takenEmail));
});

describe("updateEmail", () => {
  it("resets emailVerified and sends a new verification email to the new address", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(originalEmail));
    const result = await updateEmail({ email: newEmail });
    expect(result.success).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.email, newEmail));
    expect(row).toBeDefined();
    expect(row.emailVerified).toBeNull();
    // #7 (ADR 0010): changing the email signs out other sessions.
    expect(row.sessionsValidAfter).toBeInstanceOf(Date);

    const tokens = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.identifier, newEmail));
    expect(tokens).toHaveLength(1);

    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({ email: newEmail }),
      expect.any(String),
    );
  });

  it("rejects an email already registered to someone else", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(newEmail));
    const result = await updateEmail({ email: takenEmail });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(newEmail));
    const result = await updateEmail({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});
