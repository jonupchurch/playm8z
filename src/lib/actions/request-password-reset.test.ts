import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const { resetMailMock, unavailableMailMock, auditMock } = vi.hoisted(() => ({
  resetMailMock: vi.fn(),
  unavailableMailMock: vi.fn(),
  auditMock: vi.fn(),
}));
vi.mock("@/lib/email/send-password-reset-email", () => ({
  sendPasswordResetEmail: resetMailMock,
}));
vi.mock("@/lib/email/send-password-reset-unavailable-email", () => ({
  sendPasswordResetUnavailableEmail: unavailableMailMock,
}));
vi.mock("@/lib/admin/log-audit-entry", () => ({ logAuditEntry: auditMock }));

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { requestPasswordReset } from "./request-password-reset";

const runId = crypto.randomUUID().slice(0, 8);
const credentialsEmail = `pwreq-cred-${runId}@example.com`;
const googleEmail = `pwreq-google-${runId}@example.com`;
const unknownEmail = `pwreq-nobody-${runId}@example.com`;
let credentialsUserId: string;
let googleUserId: string;

beforeAll(async () => {
  const [cred] = await db
    .insert(users)
    .values({
      email: credentialsEmail,
      handle: `pwreqcred${runId}`,
      passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
    })
    .returning({ id: users.id });
  credentialsUserId = cred.id;

  // A Google account: created by the adapter, never given a passwordHash.
  const [google] = await db
    .insert(users)
    .values({ email: googleEmail, handle: `pwreqgoogle${runId}` })
    .returning({ id: users.id });
  googleUserId = google.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, credentialsUserId));
  await db.delete(users).where(eq(users.id, googleUserId));
});

beforeEach(async () => {
  vi.clearAllMocks();
  resetMailMock.mockResolvedValue({ sent: true, id: "x" });
  unavailableMailMock.mockResolvedValue({ sent: true, id: "x" });
  auditMock.mockResolvedValue(undefined);
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, credentialsUserId));
});

afterEach(async () => {
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, credentialsUserId));
});

// FR-004's only real defence. Every one of these paths does something
// different internally; a person on the outside must not be able to tell.
describe("requestPasswordReset does not leak who has an account (FR-004)", () => {
  it("answers identically for a registered, a Google-only, and an unknown address", async () => {
    const registered = await requestPasswordReset({ email: credentialsEmail });
    const google = await requestPasswordReset({ email: googleEmail });
    const unknown = await requestPasswordReset({ email: unknownEmail });

    expect(registered).toEqual(google);
    expect(google).toEqual(unknown);
    // Pin the actual shape too -- `toEqual` between three identical
    // failures would also pass.
    expect(registered).toEqual({ success: true });
  });

  it("answers identically when throttled as when it actually sends (FR-020 vs FR-004)", async () => {
    const first = await requestPasswordReset({ email: credentialsEmail });
    const throttled = await requestPasswordReset({ email: credentialsEmail });

    expect(throttled).toEqual(first);
    // ...and prove the throttle really engaged, or this asserts nothing:
    // two identical successes is also what a broken throttle looks like.
    expect(resetMailMock).toHaveBeenCalledTimes(1);
  });

  it("answers identically when the send itself fails", async () => {
    resetMailMock.mockResolvedValue({ sent: false, reason: "Domain is not verified" });
    const failed = await requestPasswordReset({ email: credentialsEmail });
    expect(failed).toEqual({ success: true });
  });

  it("rejects a malformed address -- safe, since that's a fact about the string", async () => {
    const result = await requestPasswordReset({ email: "not-an-email" });
    expect(result.success).toBe(false);
    expect(resetMailMock).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset sends the right thing to the right account", () => {
  it("sends a reset link to a Credentials account (FR-003)", async () => {
    await requestPasswordReset({ email: credentialsEmail });
    expect(resetMailMock).toHaveBeenCalledTimes(1);
    expect(unavailableMailMock).not.toHaveBeenCalled();

    const [user, token] = resetMailMock.mock.calls[0];
    expect(user.email).toBe(credentialsEmail);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stores a token for a Credentials request", async () => {
    await requestPasswordReset({ email: credentialsEmail });
    const rows = await db
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, credentialsUserId));
    expect(rows).toHaveLength(1);
  });

  it("sends the Google-only note, and NO link, for a password-less account (FR-005)", async () => {
    await requestPasswordReset({ email: googleEmail });
    expect(unavailableMailMock).toHaveBeenCalledTimes(1);
    expect(resetMailMock).not.toHaveBeenCalled();
  });

  it("never mints a token for a Google-only account (research.md #8)", async () => {
    await requestPasswordReset({ email: googleEmail });
    const rows = await db
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, googleUserId));
    // A token here would be a route to giving a Google account a password
    // it never asked for.
    expect(rows).toHaveLength(0);
  });

  it("sends nothing at all to an unknown address (FR-006)", async () => {
    await requestPasswordReset({ email: unknownEmail });
    expect(resetMailMock).not.toHaveBeenCalled();
    expect(unavailableMailMock).not.toHaveBeenCalled();
  });

  it("matches the address case-insensitively", async () => {
    await requestPasswordReset({ email: credentialsEmail.toUpperCase() });
    expect(resetMailMock).toHaveBeenCalledTimes(1);
  });
});

describe("requestPasswordReset audit (FR-017)", () => {
  it("records the request with no actor -- a logged-out stranger", async () => {
    await requestPasswordReset({ email: credentialsEmail });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: null, category: "access" }),
    );
  });

  it("records requests for addresses that don't exist too", async () => {
    await requestPasswordReset({ email: unknownEmail });
    // A burst of these is itself the signal worth seeing.
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { outcome: "no-account" } }),
    );
  });

  it("distinguishes the three outcomes internally, even though the caller can't", async () => {
    await requestPasswordReset({ email: credentialsEmail });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { outcome: "link-sent" } }),
    );
    vi.clearAllMocks();
    auditMock.mockResolvedValue(undefined);
    await requestPasswordReset({ email: googleEmail });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { outcome: "google-only" } }),
    );
  });
});
