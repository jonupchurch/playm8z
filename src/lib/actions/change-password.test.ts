import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { changePassword } = await import("./change-password");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const currentPassword = "correcthorse";
const emails = {
  update: `change-password-update-${runId}@example.com`,
  wrong: `change-password-wrong-${runId}@example.com`,
  short: `change-password-short-${runId}@example.com`,
  google: `change-password-google-${runId}@example.com`,
};

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const passwordHash = await hash(currentPassword, 10);
  await db.insert(users).values([
    { email: emails.update, passwordHash, handle: `changepasswordupdate${runId}` },
    { email: emails.wrong, passwordHash, handle: `changepasswordwrong${runId}` },
    { email: emails.short, passwordHash, handle: `changepasswordshort${runId}` },
    { email: emails.google, handle: `changepasswordgoogle${runId}` },
  ]);
});

afterAll(async () => {
  for (const email of Object.values(emails)) {
    await db.delete(users).where(eq(users.email, email));
  }
});

describe("changePassword", () => {
  it("updates the password hash when the current password is correct", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(emails.update));
    const result = await changePassword({ currentPassword, newPassword: "newpassword123" });
    expect(result.success).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.email, emails.update));
    expect(row.passwordHash).not.toBeNull();
    // #7 (ADR 0010): a password change signs out other sessions by
    // stamping the revocation timestamp (seeded null above).
    expect(row.sessionsValidAfter).toBeInstanceOf(Date);
  });

  it("rejects an incorrect current password", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(emails.wrong));
    const result = await changePassword({
      currentPassword: "definitelywrong",
      newPassword: "anothernewpassword",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/incorrect/i);
  });

  it("rejects a new password under 8 characters", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(emails.short));
    const result = await changePassword({ currentPassword, newPassword: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects for a Google-only account with no password set", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(emails.google));
    const result = await changePassword({
      currentPassword: "anything",
      newPassword: "newpassword123",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/doesn't have a password/i);
  });
});
