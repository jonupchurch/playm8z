import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { credentialsSchema } from "@/lib/validations/auth";
import { reactivateOnSignIn } from "@/lib/auth/reactivate-on-sign-in";
import { verifyGoogleEmail } from "@/lib/auth/verify-google-email";
import { initializeDiscoverableDefault } from "@/lib/auth/initialize-discoverable-default";
import { isSessionRevoked } from "@/lib/auth/is-session-revoked";
import { checkRateLimit } from "@/lib/rate-limit/check-rate-limit";
import { clientIp } from "@/lib/rate-limit/client-ip";
import { RATE_LIMITS } from "@/lib/rate-limit/limits";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  // Credentials-provider sessions can't be looked up via the adapter's
  // database-session storage, so JWT sessions are required whenever
  // Credentials is one of the providers.
  session: { strategy: "jwt" },
  events: {
    // Admin Settings (024)/FR-011: the only point @auth/drizzle-adapter
    // creates a `user` row itself -- Google OAuth's own sign-up path.
    // The Credentials sign-up path (register/route.ts) sets this at
    // insert time instead, since it never goes through the adapter.
    async createUser({ user }) {
      if (user.id) await initializeDiscoverableDefault(user.id);
    },
  },
  callbacks: {
    // Profile + Account settings (007), research.md #3: a deactivated
    // account (user.deactivatedAt set) reactivates automatically on
    // its next successful sign-in -- no separate "undo" step. Runs for
    // both providers; a no-op UPDATE when already null.
    //
    // Also fixes a real bug (verify-google-email.ts): the Google
    // provider's own `profile()` below computes `emailVerified` from
    // Google's `email_verified` claim, but @auth/core's OAuth callback
    // handler unconditionally forces `emailVerified: null` for a
    // brand-new account, overriding it.
    async signIn({ user, account, profile }) {
      if (user.id) {
        await reactivateOnSignIn(user.id);
      }
      if (account?.provider === "google" && profile?.email_verified && user.id) {
        await verifyGoogleEmail(user.id);
      }
      return true;
    },

    // Password reset (033)/FR-013, ADR 0010. Sessions are JWTs -- self-
    // contained and valid until they expire, with no server-side row to
    // delete -- so revocation can only work by refusing tokens older than
    // `users.sessionsValidAfter`. Returning null here invalidates the
    // session (@auth/core: `jwt` returns `Awaitable<JWT | null>`).
    //
    // Read ADR 0010 before touching this. Two things it costs and one it
    // buys:
    //   - it adds a DB read to EVERY authenticated request sitewide; this
    //     callback did not exist before, so that path did zero DB work.
    //     The cost was weighed against a free writes-only alternative and
    //     accepted, so a later "optimisation" that drops it is re-opening a
    //     settled decision, not finding a win.
    //   - a bug here that revokes too eagerly logs out 100% of users.
    //     `sessionsValidAfter IS NULL` (every account today) MUST pass.
    async jwt({ token }) {
      if (await isSessionRevoked(token.sub, token.iat)) return null;
      return token;
    },
  },
  providers: [
    Google({
      // Google has already verified the address; carry its own
      // `email_verified` claim through rather than assuming true, so a
      // Google account's emailVerified accurately reflects Google's claim.
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (rawCredentials, request) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        // Rate-limit brute-force login per client IP (ADR 0020). Keyed by
        // IP, not email, so an attacker can't lock a victim out by spamming
        // their address. A throttled attempt returns null -- to the client
        // it's indistinguishable from a bad password, which is fine: the
        // goal is to stop the guessing, not to explain the block. Skipped
        // when there's no real forwarded IP (local dev / e2e / CI).
        const ip = clientIp(request?.headers ?? new Headers());
        if (ip) {
          const gate = await checkRateLimit(`login:${ip}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
          if (!gate.allowed) return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email));

        if (!user?.passwordHash) return null;

        const passwordMatches = await compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!passwordMatches) return null;

        return user;
      },
    }),
  ],
});
