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

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  // Credentials-provider sessions can't be looked up via the adapter's
  // database-session storage, so JWT sessions are required whenever
  // Credentials is one of the providers.
  session: { strategy: "jwt" },
  callbacks: {
    // Profile + Account settings (007), research.md #3: a deactivated
    // account (user.deactivatedAt set) reactivates automatically on
    // its next successful sign-in -- no separate "undo" step. Runs for
    // both providers; a no-op UPDATE when already null.
    async signIn({ user }) {
      if (user.id) {
        await reactivateOnSignIn(user.id);
      }
      return true;
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
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

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
