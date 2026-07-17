import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import {
  createPasswordResetToken,
  redeemPasswordResetToken,
  wasResetRequestedRecently,
  RESET_TOKEN_TTL_MS,
  __hashTokenForTests as hashToken,
} from "./password-reset-token";

const runId = crypto.randomUUID().slice(0, 8);
let userId: string;
let otherUserId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: `pwreset-${runId}@example.com`, handle: `pwreset${runId}` })
    .returning({ id: users.id });
  userId = user.id;

  const [other] = await db
    .insert(users)
    .values({ email: `pwresetother-${runId}@example.com`, handle: `pwresetother${runId}` })
    .returning({ id: users.id });
  otherUserId = other.id;
});

afterAll(async () => {
  // Tokens cascade with the user; scoped to this run's ids only.
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, otherUserId));
});

async function clearTokens(id: string) {
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
}

async function liveTokenCount(id: string) {
  const rows = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, id), isNull(passwordResetTokens.usedAt)));
  return rows.length;
}

describe("createPasswordResetToken", () => {
  it("returns a high-entropy raw token and stores only its hash (FR-012)", async () => {
    await clearTokens(userId);
    const raw = await createPasswordResetToken(userId);

    expect(raw).toMatch(/^[0-9a-f]{64}$/); // 32 random bytes, hex

    const [row] = await db
      .select({ tokenHash: passwordResetTokens.tokenHash })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));

    // The whole point: a reader of this table cannot use what they find.
    expect(row.tokenHash).not.toBe(raw);
    expect(row.tokenHash).toBe(hashToken(raw));

    // And the raw value appears nowhere in the row at all.
    expect(JSON.stringify(row)).not.toContain(raw);
  });

  it("expires the token an hour out, not a day (FR-008)", async () => {
    await clearTokens(userId);
    const before = Date.now();
    await createPasswordResetToken(userId);

    const [row] = await db
      .select({ expires: passwordResetTokens.expires })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));

    const ttl = row.expires.getTime() - before;
    expect(ttl).toBeGreaterThan(RESET_TOKEN_TTL_MS - 60_000);
    expect(ttl).toBeLessThanOrEqual(RESET_TOKEN_TTL_MS + 60_000);
    // Guards against silently inheriting verification's 24h.
    expect(ttl).toBeLessThan(1000 * 60 * 60 * 2);
  });

  it("issues a distinct token every time", async () => {
    await clearTokens(userId);
    const a = await createPasswordResetToken(userId);
    const b = await createPasswordResetToken(userId);
    expect(a).not.toBe(b);
  });
});

describe("redeemPasswordResetToken", () => {
  it("redeems a fresh token and returns the account", async () => {
    await clearTokens(userId);
    const raw = await createPasswordResetToken(userId);
    await expect(redeemPasswordResetToken(raw)).resolves.toEqual({ userId });
  });

  it("is single-use: the second redemption fails (FR-010)", async () => {
    await clearTokens(userId);
    const raw = await createPasswordResetToken(userId);

    // Positive control FIRST -- without it, this test also passes when
    // token creation is completely broken and nothing ever redeems.
    await expect(redeemPasswordResetToken(raw)).resolves.toEqual({ userId });
    await expect(redeemPasswordResetToken(raw)).resolves.toBeNull();
  });

  it("refuses an expired token -- and would have accepted it before expiry", async () => {
    await clearTokens(userId);
    const raw = await createPasswordResetToken(userId);

    // Positive control: prove the token is otherwise good, by checking the
    // row exists and is live, before ageing it out. A bare "expired token
    // fails" assertion passes even if createPasswordResetToken never
    // wrote anything at all.
    expect(await liveTokenCount(userId)).toBe(1);

    await db
      .update(passwordResetTokens)
      .set({ expires: new Date(Date.now() - 1000) })
      .where(eq(passwordResetTokens.userId, userId));

    await expect(redeemPasswordResetToken(raw)).resolves.toBeNull();
  });

  it("supersedes earlier tokens: only the newest works (FR-009)", async () => {
    await clearTokens(userId);
    const first = await createPasswordResetToken(userId);
    const second = await createPasswordResetToken(userId);

    await expect(redeemPasswordResetToken(first)).resolves.toBeNull();
    await expect(redeemPasswordResetToken(second)).resolves.toEqual({ userId });
  });

  it("leaves exactly one live token after two concurrent issues (the supersede race)", async () => {
    await clearTokens(userId);
    // The reason supersede is an explicit write inside the insert's
    // transaction rather than a read-time "newest wins": both of these
    // would otherwise read "I am newest" and both stay valid, leaving two
    // live takeover credentials outstanding.
    await Promise.all([createPasswordResetToken(userId), createPasswordResetToken(userId)]);
    expect(await liveTokenCount(userId)).toBe(1);
  });

  it("fails identically for unknown, malformed and empty tokens (FR-018)", async () => {
    await expect(redeemPasswordResetToken("nonsense")).resolves.toBeNull();
    await expect(redeemPasswordResetToken("a".repeat(64))).resolves.toBeNull();
    await expect(redeemPasswordResetToken("")).resolves.toBeNull();
    await expect(redeemPasswordResetToken("../../etc/passwd")).resolves.toBeNull();
  });

  it("does not accept a token's stored HASH in place of the token", async () => {
    await clearTokens(userId);
    const raw = await createPasswordResetToken(userId);
    // If anyone ever "simplifies" this by comparing the incoming value to
    // tokenHash directly, a leaked table row becomes a working credential
    // again and FR-012 is quietly void.
    await expect(redeemPasswordResetToken(hashToken(raw))).resolves.toBeNull();
    await expect(redeemPasswordResetToken(raw)).resolves.toEqual({ userId });
  });

  it("never redeems one account's token as another account", async () => {
    await clearTokens(userId);
    await clearTokens(otherUserId);
    const mine = await createPasswordResetToken(userId);
    await createPasswordResetToken(otherUserId);

    await expect(redeemPasswordResetToken(mine)).resolves.toEqual({ userId });
  });

  it("only one of two concurrent redemptions of the same link succeeds", async () => {
    await clearTokens(userId);
    const raw = await createPasswordResetToken(userId);

    const results = await Promise.all([
      redeemPasswordResetToken(raw),
      redeemPasswordResetToken(raw),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("wasResetRequestedRecently (FR-020 throttle)", () => {
  it("is false with no tokens at all", async () => {
    await clearTokens(userId);
    await expect(wasResetRequestedRecently(userId)).resolves.toBe(false);
  });

  it("is true immediately after issuing", async () => {
    await clearTokens(userId);
    await createPasswordResetToken(userId);
    await expect(wasResetRequestedRecently(userId)).resolves.toBe(true);
  });

  it("is false once the window has passed", async () => {
    await clearTokens(userId);
    await createPasswordResetToken(userId);
    await db
      .update(passwordResetTokens)
      .set({ createdAt: new Date(Date.now() - 1000 * 60 * 5) })
      .where(eq(passwordResetTokens.userId, userId));
    await expect(wasResetRequestedRecently(userId)).resolves.toBe(false);
  });

  it("throttles per account, not globally", async () => {
    await clearTokens(userId);
    await clearTokens(otherUserId);
    await createPasswordResetToken(userId);
    // One account's request must never suppress another's mail.
    await expect(wasResetRequestedRecently(otherUserId)).resolves.toBe(false);
  });

  // A used/superseded token still counts: the point is how often we SEND,
  // not how many links are live. Otherwise requesting twice in a row would
  // supersede the first (marking it used) and thereby un-throttle itself.
  it("still throttles when the recent token has already been superseded", async () => {
    await clearTokens(userId);
    await createPasswordResetToken(userId);
    await createPasswordResetToken(userId);
    await expect(wasResetRequestedRecently(userId)).resolves.toBe(true);
  });
});
