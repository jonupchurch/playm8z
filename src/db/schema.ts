import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  uuid,
  boolean,
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

// Singleton config row. This feature (Error Pages) only reads it; the
// future Admin Settings feature owns writing to it and will extend this
// same table with its other toggles rather than this feature inventing
// a shape that gets replaced later (research.md #2).
export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  maintenanceMode: boolean("maintenanceMode").notNull().default(false),
  maintenanceMessage: text("maintenanceMessage"),
});

// Minimal shape -- Home is the first feature to need this table, so it
// defines only the columns its own FRs require. The future Post a Game
// feature extends this same table with its remaining columns (ageGroup,
// timeSlots, platform, micRequired, scheduledDate, recurring, voiceLink,
// tags) via its own migration, per data-model.md.
export const postings = pgTable("postings", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostId: uuid("hostId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Free-text keyword, per ADR 0001 -- not a foreign key to a catalog table.
  game: text("game").notNull(),
  title: text("title").notNull(),
  blurb: text("blurb").notNull(),
  vibe: text("vibe").notNull(),
  region: text("region").notNull(),
  seatsTotal: integer("seatsTotal").notNull(),
  seatsOpen: integer("seatsOpen").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  // Added by Browse (004) -- an extensible, bounded set distinct from
  // the free-text `game` field (data-model.md). Loosened to nullable by
  // Post a Game (005): its own data-model.md always treated genre as
  // optional (no chip selection required to publish, matching FR-014's
  // game+title-only requirement), which Browse's original NOT NULL
  // never accounted for -- listing-card.tsx already renders game-only
  // when genre is absent, and Browse's genre filter already degrades
  // correctly (a genre-less posting just never matches an active genre
  // chip), so no other query needed to change.
  genre: text("genre"),
  // 18|21 only (ADR 0002) -- never 13.
  ageGroup: text("ageGroup").notNull(),
  timeSlots: text("timeSlots").array().notNull(),
  platform: text("platform").notNull(),
  micRequired: boolean("micRequired").notNull().default(false),
  // Optional -- drives "Soonest" sort; null sorts after any posting
  // that has a value (data-model.md).
  scheduledDate: timestamp("scheduledDate", { mode: "date" }),
  // Added by Post a Game (005) -- the last remaining fields this form
  // collects (data-model.md).
  tags: text("tags").array().notNull().default([]),
  recurring: boolean("recurring").notNull().default(false),
  voiceLink: text("voiceLink"),
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
