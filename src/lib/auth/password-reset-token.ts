import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";

// FR-008. An hour, against email verification's 24 -- this link can take
// over an account, that one can only confirm an address its holder already
// controls.
export const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

// FR-020. The throttle rides on the row we already have to read for
// FR-009's supersede, which is why this feature needs no rate-limiting
// infrastructure (research.md #4).
export const RESET_REQUEST_THROTTLE_MS = 1000 * 60;

/**
 * SHA-256, not bcrypt, on purpose. bcrypt is deliberately slow to defend
 * *low-entropy* human passwords against brute force. A 32-byte random
 * token carries 256 bits of entropy -- there is nothing to brute-force, so
 * a slow hash would buy nothing and cost latency on every redemption.
 * "We already use bcrypt for passwords" is the obvious wrong turn here.
 */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Mints a reset token for an account and returns the RAW value -- the only
 * time it exists. Only its hash is stored (FR-012), so this return value is
 * the sole copy: put it in the link, don't log it.
 *
 * Supersedes every outstanding token for the account (FR-009).
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.transaction(async (tx) => {
    // FR-009 as an EXPLICIT write, not a read-time `ORDER BY createdAt
    // DESC LIMIT 1`. Two concurrent requests would both read "I am
    // newest" and both stay valid -- a TOCTOU race that leaves two live
    // takeover credentials outstanding. Invalidating here, inside the
    // transaction that inserts the replacement, has no such window.
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)),
      );

    // `createdAt` is set EXPLICITLY rather than left to the column's
    // defaultNow(). These columns are `timestamp without time zone`, and
    // postgres.js serializes a JS Date differently from how Postgres's own
    // now() fills the default -- they can sit hours apart. Since
    // wasResetRequestedRecently() compares this column against a JS Date,
    // mixing the two clocks made the FR-020 throttle never fire at all:
    // it failed *open*, silently, with nothing to catch it but the tests
    // below. Both sides now come from the same clock, as `expires` already
    // did (which is why expiry worked while the throttle didn't).
    await tx
      .insert(passwordResetTokens)
      .values({ userId, tokenHash: hashToken(rawToken), expires, createdAt: new Date() });
  });

  return rawToken;
}

/**
 * True if a token was minted for this account within the throttle window
 * (FR-020) -- i.e. don't send another.
 *
 * The caller MUST NOT surface this to the user. Telling someone "wait 42
 * seconds" confirms the address has an account, which is exactly the
 * enumeration tell FR-004 forbids. The limit is enforced on the *send*,
 * never on the response (research.md #4).
 */
export async function wasResetRequestedRecently(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - RESET_REQUEST_THROTTLE_MS);
  const [recent] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(eq(passwordResetTokens.userId, userId), gt(passwordResetTokens.createdAt, since)),
    )
    .limit(1);
  return Boolean(recent);
}

/**
 * True if a token is currently redeemable -- WITHOUT consuming it.
 *
 * Only for deciding what to render on the reset screen: showing someone a
 * password field, letting them think one up and type it, and only then
 * saying "actually that link is dead" is a needlessly cruel way to deliver
 * the news.
 *
 * Checking is not consuming, so a prefetcher or mail scanner following the
 * link burns nothing. It leaks nothing either -- the caller already holds
 * the token, so being told it's expired tells them only about a secret
 * they have.
 *
 * NOT a substitute for the check inside redeemPasswordResetToken(): this
 * is a hint for the UI, and the token could expire between this call and
 * the submit. Redemption is still the real, atomic gate.
 */
export async function isResetTokenLive(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const [row] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(rawToken)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expires, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Redeems a raw token, returning the account it belongs to, or null.
 *
 * Null for every failure -- expired, already used, superseded, unknown,
 * malformed. The caller cannot tell them apart and must not try (FR-018):
 * "expired" vs "never existed" tells a holder whether they're guessing at
 * a real account.
 */
export async function redeemPasswordResetToken(rawToken: string): Promise<{ userId: string } | null> {
  if (!rawToken) return null;

  // One atomic WHERE-guarded transition, not select-then-update. Two
  // concurrent redemptions of the same link would otherwise both read
  // `usedAt IS NULL` and both proceed; here exactly one UPDATE matches and
  // the loser returns no row. FR-010 is only single-use if it's atomic.
  const [redeemed] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(rawToken)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expires, new Date()),
      ),
    )
    .returning({ userId: passwordResetTokens.userId });

  return redeemed ?? null;
}

/** Exported for tests, which must confirm the raw token is never stored. */
export const __hashTokenForTests = hashToken;
