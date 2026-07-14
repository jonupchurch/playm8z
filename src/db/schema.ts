import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  uuid,
  boolean,
  unique,
  jsonb,
  type AnyPgColumn,
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

// Blocked Users (008) -- a block is "active" when unblockedAt IS NULL.
// Not hard-deleted on unblock (ADR 0005 -- unlike SavedListing/
// UserGame's scoped exception, a block has real trust/safety history
// value); re-blocking after an unblock creates a NEW row rather than
// clearing unblockedAt on the old one, keeping each cycle legible.
// Every other feature's enforcement logic (Home, Browse, Listing
// detail, future Inbox/Forum) should query active blocks in both
// directions -- this feature only defines the table and the block/
// unblock actions, not that enforcement (spec.md FR-011).
export const blocks = pgTable("blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  blockerId: uuid("blockerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  blockedId: uuid("blockedId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  unblockedAt: timestamp("unblockedAt", { mode: "date" }),
});

// Blocked Users (008) -- this feature's first writer, via the Block
// modal's "Also report to moderators" checkbox (targetType='user'
// only). guidelines.md's documented shape covers other target types
// too; the not-yet-spec'd Notifications & Report feature owns every
// other write path and all review/moderation UI.
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporterId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: text("targetType").notNull(),
  targetId: uuid("targetId").notNull(),
  reason: text("reason"),
  // Added by Notifications + Report modal (012) -- FR-007 requires
  // persisting the report flow's optional free-text details, which
  // neither data-model.md's original sketch nor Blocked Users'/Forum
  // Thread's existing writes accounted for (both leave it null, same
  // reasoning as `reason` starting out null before this feature).
  details: text("details"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Forum index (009) -- this feature's first writer. `categoryId` is
// one of the six hardcoded keys in src/lib/forum/categories.ts, not a
// foreign key (categories aren't a table). `pinned`/`locked` are
// moderator-controlled -- this feature only ever inserts `false` and
// never changes either afterward (the future Admin Forum feature owns
// setting them). `replyCount`/`viewCount`/`likes` all start at 0 and
// are maintained by the future Forum Thread feature, not this one.
export const forumThreads = pgTable("forumThreads", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: text("categoryId").notNull(),
  authorId: uuid("authorId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags").array().notNull().default([]),
  pinned: boolean("pinned").notNull().default(false),
  locked: boolean("locked").notNull().default(false),
  replyCount: integer("replyCount").notNull().default(0),
  viewCount: integer("viewCount").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Forum Thread (010) -- this feature's only writer. `likes` is
// denormalized (kept in sync with the `likes` table below on every
// like/unlike) for fast reads; that table remains the source of truth
// for "did this user like this." No `isBestAnswer` column (research.md
// #4 -- nothing anywhere sets it).
export const forumReplies = pgTable("forumReplies", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("threadId")
    .notNull()
    .references(() => forumThreads.id, { onDelete: "cascade" }),
  authorId: uuid("authorId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  quotedReplyId: uuid("quotedReplyId").references((): AnyPgColumn => forumReplies.id),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Forum Thread (010) -- a real per-user relationship, not a bare
// counter, so double-liking and unliking both work correctly
// (research.md #2). The unique constraint on (userId, targetType,
// targetId) is the actual enforcement point, not just an
// application-level check, since two near-simultaneous requests could
// otherwise both pass an application check before either insert lands.
// Unliking deletes the row outright -- a like carries no audit/trust
// value worth preserving (same reasoning as SavedListing/UserGame,
// ADR 0005's scoped exception).
export const likes = pgTable(
  "likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("targetType").notNull(),
    targetId: uuid("targetId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.targetType, table.targetId)],
);

// Forum Thread (010) -- stores a per-user thread-subscription
// preference only (research.md #5); nothing currently reads this to
// send a notification, since no notification-delivery mechanism
// exists yet. Unsubscribing deletes the row (same reasoning as Likes).
// The unique constraint prevents a duplicate row under the same
// toggle-race concern that motivated `likes`' own constraint.
export const threadSubscriptions = pgTable(
  "threadSubscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: uuid("threadId")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.threadId)],
);

// Inbox / messaging (011) -- this feature's first writer for both new
// tables. `memberIds` isn't FK-enforced by Postgres (arrays can't
// reference a table); validated at the Server Action layer instead,
// the same reasoning as forumThreads' free-text categoryId. A direct
// (non-group) conversation between the same two members is never
// duplicated -- start-conversation.ts checks for an existing one
// first (data-model.md). `lastReadAt` maps each member's own id to
// the ISO timestamp they last viewed this conversation, so per-viewer
// unread counts can be derived without a separate per-member table --
// not in data-model.md's original two-column sketch, added here for
// the same reason threadSubscriptions' unique constraint was added
// retroactively: FR-002/FR-004's "accurate unread indicator" can't be
// satisfied without some per-viewer read cursor, and a JSON column on
// the table this feature already owns is the smallest addition that
// works.
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  isGroup: boolean("isGroup").notNull().default(false),
  name: text("name"),
  memberIds: uuid("memberIds").array().notNull(),
  lastMessageAt: timestamp("lastMessageAt", { mode: "date" }).notNull().defaultNow(),
  lastReadAt: jsonb("lastReadAt").notNull().default({}).$type<Record<string, string>>(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Inbox / messaging (011) -- this feature's only writer. `senderId` is
// nullable for system messages (e.g. "You accepted -- @applicant
// joined the party"), created by accept-request.ts. Append-only -- no
// edit/delete concern surfaces in this feature's own scope.
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("senderId").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("text"),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Notifications + Report modal (012) -- this feature's only writer.
// `type` is one of guidelines.md's documented values: join | accepted |
// reply | mention | message | rating | news | system. `join`/`accepted`
// (pending/resolved party requests) are instead synthesized live from
// `applications` for real users (get-notifications.ts) rather than ever
// inserted here, since no other feature calls createNotification() yet
// (research.md #1) -- in production this table only ever holds rows a
// future feature's own amendment writes, plus whatever this feature's
// own tests/seed data insert directly. `actorId` is null for
// system-originated notifications (e.g. `news`). Never removed, only
// marked read (ADR 0005).
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  actorId: uuid("actorId").references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  targetRef: text("targetRef").notNull(),
  read: boolean("read").notNull().default(false),
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
