import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isSessionRevoked } from "./is-session-revoked";

const runId = crypto.randomUUID().slice(0, 8);
let userId: string;
let otherUserId: string;

const nowSeconds = () => Math.floor(Date.now() / 1000);

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: `revoke-${runId}@example.com`, handle: `revoke${runId}` })
    .returning({ id: users.id });
  userId = user.id;

  const [other] = await db
    .insert(users)
    .values({ email: `revokeother-${runId}@example.com`, handle: `revokeother${runId}` })
    .returning({ id: users.id });
  otherUserId = other.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, otherUserId));
});

beforeEach(async () => {
  await db.update(users).set({ sessionsValidAfter: null }).where(eq(users.id, userId));
  await db.update(users).set({ sessionsValidAfter: null }).where(eq(users.id, otherUserId));
});

async function revokeAt(id: string, when: Date) {
  await db.update(users).set({ sessionsValidAfter: when }).where(eq(users.id, id));
}

// The single most dangerous predicate in the app. Wrong one way it
// silently voids FR-013; wrong the other it signs out every user on the
// site. Both directions are pinned.
describe("isSessionRevoked", () => {
  describe("must NOT revoke", () => {
    // The state of every account in production right now. If this ever
    // returns true, the deploy logs out 100% of users.
    it("a user who has never reset (sessionsValidAfter IS NULL)", async () => {
      await expect(isSessionRevoked(userId, nowSeconds())).resolves.toBe(false);
    });

    it("a NULL user even with an ancient token", async () => {
      await expect(isSessionRevoked(userId, nowSeconds() - 60 * 60 * 24 * 365)).resolves.toBe(false);
    });

    it("a token issued AFTER the reset -- the one they just logged in with", async () => {
      await revokeAt(userId, new Date(Date.now() - 60_000));
      await expect(isSessionRevoked(userId, nowSeconds())).resolves.toBe(false);
    });

    it("an unknown user id", async () => {
      await expect(
        isSessionRevoked("00000000-0000-0000-0000-000000000000", nowSeconds()),
      ).resolves.toBe(false);
    });

    it("a token with no user id or no issue time", async () => {
      await expect(isSessionRevoked(undefined, nowSeconds())).resolves.toBe(false);
      await expect(isSessionRevoked(userId, undefined)).resolves.toBe(false);
    });

    // Blast-radius check: revoking one account must not touch anyone else.
    // A test that only proves "the stale session died" also passes when
    // EVERY session dies.
    it("an unrelated user's session when someone else resets", async () => {
      await revokeAt(otherUserId, new Date());
      await expect(isSessionRevoked(userId, nowSeconds() - 3600)).resolves.toBe(false);
    });
  });

  describe("must revoke", () => {
    it("a token issued before the reset (FR-013)", async () => {
      await revokeAt(userId, new Date());
      await expect(isSessionRevoked(userId, nowSeconds() - 3600)).resolves.toBe(true);
    });

    it("a token issued a second before the reset", async () => {
      const when = new Date();
      await revokeAt(userId, when);
      await expect(
        isSessionRevoked(userId, Math.floor(when.getTime() / 1000) - 2),
      ).resolves.toBe(true);
    });
  });

  // THE regression. This started life asserting the opposite -- "tie means
  // revoked, fail closed" -- which sounds obviously right and shipped a
  // real lockout: reset at t=100.7 floors to 100, the user's brand-new
  // login at t=100.9 also has iat 100, and `<=` threw them straight back
  // out. The unit test passed because it encoded the same wrong assumption
  // as the code; e2e/password-reset.spec.ts caught it by actually logging
  // in afterwards.
  //
  // A token issued in the same second as a reset is, in practice, the
  // person who just reset.
  it("does NOT revoke a token issued in the same second as the reset (the post-reset login)", async () => {
    const when = new Date();
    await revokeAt(userId, when);
    await expect(isSessionRevoked(userId, Math.floor(when.getTime() / 1000))).resolves.toBe(false);
  });

  // Regression guard for the bug that already bit this feature once, in
  // password-reset-token.ts: these are `timestamp without time zone`
  // columns, and mixing Postgres's clock with JavaScript's silently skews
  // them by hours. `iat` comes from Auth.js (a JS clock) and is compared to
  // a column read back through postgres.js -- so if that round-trip ever
  // stops being exact, revocation breaks in whichever direction the skew
  // happens to fall, and only this test would notice.
  it("round-trips the timestamp without clock skew", async () => {
    const when = new Date();
    await revokeAt(userId, when);

    const [row] = await db
      .select({ sessionsValidAfter: users.sessionsValidAfter })
      .from(users)
      .where(eq(users.id, userId));

    const skewMs = Math.abs(row.sessionsValidAfter!.getTime() - when.getTime());
    expect(skewMs).toBeLessThan(1000);

    // And prove it end-to-end: either side of the write must land on
    // opposite sides of the decision.
    const at = Math.floor(when.getTime() / 1000);
    await expect(isSessionRevoked(userId, at - 2)).resolves.toBe(true);
    await expect(isSessionRevoked(userId, at + 2)).resolves.toBe(false);
  });
});
