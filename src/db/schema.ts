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
  // Added by Profile + Account settings (007).
  bio: text("bio"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  privacyShowAge: boolean("privacyShowAge").notNull().default(true),
  privacyShowRegion: boolean("privacyShowRegion").notNull().default(true),
  privacyShowOnline: boolean("privacyShowOnline").notNull().default(true),
  privacyDiscoverable: boolean("privacyDiscoverable").notNull().default(true),
  // Non-null hides the profile/postings from other visitors (FR-013);
  // cleared automatically on the owner's next successful sign-in
  // (research.md #3, src/auth.ts's signIn callback).
  deactivatedAt: timestamp("deactivatedAt", { mode: "date" }),
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

// Listing detail (006) -- its first real writer. A unique active
// application per (postingId, applicantId) is enforced at the Server
// Action level (data-model.md), not a DB constraint, since Drizzle's
// partial-unique-index support varies and the check is cheap in code.
export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  postingId: uuid("postingId")
    .notNull()
    .references(() => postings.id, { onDelete: "cascade" }),
  applicantId: uuid("applicantId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message"),
  // pending | accepted | declined | withdrawn -- `withdrawn` is
  // distinct from `declined` so the record stays legible about who
  // ended it and why (ADR 0005, research.md #5).
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Listing detail (006) -- a listing's public Q&A thread. One reply per
// question, settable only by the listing's host (reply-to-question.ts).
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  postingId: uuid("postingId")
    .notNull()
    .references(() => postings.id, { onDelete: "cascade" }),
  askerId: uuid("askerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  reply: text("reply"),
  repliedAt: timestamp("repliedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Owned by Profile (007-profile-and-account-settings) for its own
// "Saved" tab -- Listing detail (006) is implemented first and is
// this table's first real consumer/creator, per the shared-table
// precedent already used for `postings` (data-model.md). Composite
// primary key (no surrogate id) mirrors `accounts`' shape above.
// Unsaving performs a real delete (a scoped exception to ADR 0005 --
// a bookmark carries no moderation/audit history worth preserving).
// Profile (007) reuses this table and Listing detail's own
// toggle-saved-listing.ts as-is -- no schema change needed here.
export const savedListings = pgTable(
  "savedListings",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postingId: uuid("postingId")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (savedListing) => [primaryKey({ columns: [savedListing.userId, savedListing.postingId] })],
);

// Profile + Account settings (007) -- richer, user-editable version of
// onboarding's flat gamesPlayed list (game + optional self-reported
// rank/hours). No soft-delete concern (ADR 0005): removing a game a
// user no longer plays is a real delete, same reasoning as SavedListing.
export const userGames = pgTable("userGames", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  game: text("game").notNull(),
  rank: text("rank"),
  hoursPlayed: integer("hoursPlayed"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
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
