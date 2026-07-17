import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * True if a JWT issued at `issuedAtSeconds` for `userId` has been revoked
 * (ADR 0010 / 033 FR-013).
 *
 * Sessions are JWTs (`auth.ts`), so there are no session rows to delete --
 * a signed token stays valid until it expires no matter what the database
 * says. Revocation can therefore only work by *dating* tokens: a reset
 * stamps `users.sessionsValidAfter`, and anything older is refused here.
 *
 * **This runs on every authenticated request across the whole site.** That
 * cost is the subject of ADR 0010 and was accepted deliberately; the free
 * alternative (checking only inside requireAuth(), which already reads this
 * row) would have left private *reads* — inbox DMs — open to a stale
 * session for the JWT's 30-day lifetime.
 *
 * Lives outside `auth.ts` because `NextAuth()` can't be meaningfully unit
 * tested, and this is the single most dangerous predicate in the app: wrong
 * in one direction it silently voids FR-013; wrong in the other it logs out
 * every user on the site.
 */
export async function isSessionRevoked(
  userId: string | undefined,
  issuedAtSeconds: number | undefined,
): Promise<boolean> {
  // No identifiable user, or a token with no issue time. Not our call to
  // reject -- Auth.js's own validation owns malformed tokens, and treating
  // "can't tell" as revoked here would log out anyone whose token predates
  // this code.
  if (!userId || typeof issuedAtSeconds !== "number") return false;

  const [user] = await db
    .select({ sessionsValidAfter: users.sessionsValidAfter })
    .from(users)
    .where(eq(users.id, userId));

  // Unknown user: leave it alone. Auth.js and requireAuth() already refuse
  // a session with no row behind it; inventing a second opinion here would
  // just be a second thing to keep in sync.
  if (!user) return false;

  // NULL means never revoked -- the state of every account on the site
  // right now, and the default for every new one. Getting this backwards
  // signs out 100% of users the moment it deploys.
  if (!user.sessionsValidAfter) return false;

  // `iat` is whole seconds; the column has sub-second precision. Floor the
  // column to compare like with like.
  const revokedAfterSeconds = Math.floor(user.sessionsValidAfter.getTime() / 1000);

  // Ties are NOT revoked, and the reason is worth spelling out because the
  // instinct here is exactly backwards.
  //
  // "Fail closed on ambiguity" was the first implementation and it shipped
  // a real lockout: reset at t=100.7 floors to 100, the user logs in with
  // their new password at t=100.9 and *that* token's iat is also 100 -- so
  // `iat <= 100` revoked the brand-new session and bounced them back to
  // /login. Reset, log in, get thrown out. A unit test asserted the tie was
  // revoked and passed happily; only the end-to-end flow caught it.
  //
  // Whose token is issued in the same second as a reset? Essentially always
  // the person who just reset. The attacker case -- someone logging in with
  // the OLD password in the same second the reset lands -- requires the
  // password that reset has just changed, plus sub-second timing. Trading a
  // guaranteed lockout of every real user for that is a bad deal, so ties
  // go to the token: a <=1s window, and only for someone who already had
  // the credentials.
  return issuedAtSeconds < revokedAfterSeconds;
}
