import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Only set for accounts created via the Credentials (native) provider;
  // null for accounts that only ever signed in through Google.
  passwordHash: text("passwordHash"),
  // Unique, immutable once set (FR-003). Nullable at the DB level even
  // though it's conceptually required: a Google sign-up's account row is
  // created by the Auth.js adapter before onboarding ever runs, so there's
  // a real (if brief) window with no handle yet -- collected at onboarding
  // Step 1 instead (research.md #2, deliberately not auto-generated).
  handle: text("handle").unique(),
  avatarColor: text("avatarColor"),
  region: text("region"),
  platforms: text("platforms").array(),
  ageGroup: text("ageGroup"),
  vibe: text("vibe"),
  playTimeSlots: text("playTimeSlots").array(),
  gamesPlayed: text("gamesPlayed").array(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);
