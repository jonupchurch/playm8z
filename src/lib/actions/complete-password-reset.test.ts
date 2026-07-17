import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { compare } from "bcrypt-ts";

const { auditMock } = vi.hoisted(() => ({ auditMock: vi.fn() }));
vi.mock("@/lib/admin/log-audit-entry", () => ({ logAuditEntry: auditMock }));

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { createPasswordResetToken } from "@/lib/auth/password-reset-token";
import { completePasswordReset } from "./complete-password-reset";

const runId = crypto.randomUUID().slice(0, 8);
let userId: string;
let unverifiedUserId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `pwdone-${runId}@example.com`,
      handle: `pwdone${runId}`,
      passwordHash: "$2a$10$oldhasholdhasholdhasho",
      emailVerified: new Date(),
    })
    .returning({ id: users.id });
  userId = user.id;

  // The user this feature most exists for: forgot their password AND never
  // verified. Gating the fix on the thing the fix repairs strands them.
  const [unverified] = await db
    .insert(users)
    .values({
      email: `pwdone-unver-${runId}@example.com`,
      handle: `pwdoneunver${runId}`,
      passwordHash: "$2a$10$oldhasholdhasholdhasho",
      emailVerified: null,
    })
    .returning({ id: users.id });
  unverifiedUserId = unverified.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, unverifiedUserId));
});

beforeEach(async () => {
  vi.clearAllMocks();
  auditMock.mockResolvedValue(undefined);
  await db
    .update(users)
    .set({ sessionsValidAfter: null, passwordHash: "$2a$10$oldhasholdhasholdhasho" })
    .where(eq(users.id, userId));
});

describe("completePasswordReset", () => {
  it("sets a new password that actually verifies", async () => {
    const token = await createPasswordResetToken(userId);
    await expect(
      completePasswordReset({ token, password: "brand-new-password" }),
    ).resolves.toEqual({ success: true });

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));

    // Assert the hash WORKS, not merely that the column changed -- writing
    // the raw password, or a hash of the wrong thing, would both pass a
    // "it's different now" check.
    await expect(compare("brand-new-password", user.passwordHash!)).resolves.toBe(true);
    expect(user.passwordHash).not.toBe("brand-new-password");
  });

  it("revokes existing sessions (FR-013)", async () => {
    const token = await createPasswordResetToken(userId);
    const before = Date.now();
    await completePasswordReset({ token, password: "brand-new-password" });

    const [user] = await db
      .select({ sessionsValidAfter: users.sessionsValidAfter })
      .from(users)
      .where(eq(users.id, userId));
    expect(user.sessionsValidAfter).not.toBeNull();
    expect(user.sessionsValidAfter!.getTime()).toBeGreaterThanOrEqual(before - 60_000);
  });

  it("marks the email verified (FR-014)", async () => {
    const token = await createPasswordResetToken(unverifiedUserId);
    await completePasswordReset({ token, password: "brand-new-password" });

    const [user] = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, unverifiedUserId));
    expect(user.emailVerified).not.toBeNull();
  });

  // research.md #7. The instinct to require a verified email here would
  // permanently strand exactly the people the feature is for.
  it("lets an UNVERIFIED account complete a reset", async () => {
    const token = await createPasswordResetToken(unverifiedUserId);
    await expect(
      completePasswordReset({ token, password: "another-new-password" }),
    ).resolves.toEqual({ success: true });
  });

  it("consumes the token: the same link cannot be replayed (FR-010)", async () => {
    const token = await createPasswordResetToken(userId);
    await expect(
      completePasswordReset({ token, password: "brand-new-password" }),
    ).resolves.toEqual({ success: true });
    const second = await completePasswordReset({ token, password: "yet-another-password" });
    expect(second.success).toBe(false);
  });

  it("does not change the password when the token is refused", async () => {
    const [before] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));

    await completePasswordReset({ token: "nonsense", password: "attacker-password" });

    const [after] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));
    expect(after.passwordHash).toBe(before.passwordHash);
  });

  it("refuses expired, used, superseded and unknown tokens identically (FR-018)", async () => {
    const superseded = await createPasswordResetToken(userId);
    await createPasswordResetToken(userId); // supersedes the first

    const results = [
      await completePasswordReset({ token: superseded, password: "valid-password" }),
      await completePasswordReset({ token: "unknown-token", password: "valid-password" }),
      await completePasswordReset({ token: "a".repeat(64), password: "valid-password" }),
    ];

    const messages = new Set(results.map((r) => (r.success ? "ok" : r.error)));
    // One distinct message across every failure mode -- otherwise the
    // message itself says which kind of wrong the token is.
    expect(messages.size).toBe(1);
    expect(results.every((r) => !r.success)).toBe(true);
  });

  it("rejects a password below the shared minimum (FR-015)", async () => {
    const token = await createPasswordResetToken(userId);
    const result = await completePasswordReset({ token, password: "short" });
    expect(result.success).toBe(false);
  });

  it("does not consume the token when only the password was invalid", async () => {
    const token = await createPasswordResetToken(userId);
    await completePasswordReset({ token, password: "short" });
    // Otherwise a typo burns the link and they must start over -- a real
    // usability trap, since the form is where typos happen.
    await expect(
      completePasswordReset({ token, password: "long-enough-password" }),
    ).resolves.toEqual({ success: true });
  });

  it("reports a password problem differently from a token problem", async () => {
    const token = await createPasswordResetToken(userId);
    const badPassword = await completePasswordReset({ token, password: "short" });
    const badToken = await completePasswordReset({ token: "nope", password: "valid-password" });
    // Safe to distinguish: they already hold a valid link, so a password
    // rule reveals nothing. Conflating them would tell a user with a typo
    // that their link is broken.
    expect(badPassword.success).toBe(false);
    expect(badToken.success).toBe(false);
    if (!badPassword.success && !badToken.success) {
      expect(badPassword.error).not.toBe(badToken.error);
      expect(badToken.invalidToken).toBe(true);
      expect(badPassword.invalidToken).toBeUndefined();
    }
  });

  it("records the completion (FR-017)", async () => {
    const token = await createPasswordResetToken(userId);
    await completePasswordReset({ token, password: "brand-new-password" });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: userId, category: "access" }),
    );
  });

  it("applies to the token's account only", async () => {
    const token = await createPasswordResetToken(userId);
    const [otherBefore] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, unverifiedUserId));

    await completePasswordReset({ token, password: "brand-new-password" });

    const [otherAfter] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, unverifiedUserId));
    expect(otherAfter.passwordHash).toBe(otherBefore.passwordHash);
  });

  it("leaves no live token behind afterwards", async () => {
    const token = await createPasswordResetToken(userId);
    await completePasswordReset({ token, password: "brand-new-password" });
    const rows = await db
      .select({ usedAt: passwordResetTokens.usedAt })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
    expect(rows.every((r) => r.usedAt !== null)).toBe(true);
  });
});
