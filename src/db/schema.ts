import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  index,
  integer,
  uuid,
  boolean,
  unique,
  jsonb,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  // The Google profile photo, populated by the Auth.js adapter on Google
  // sign-in (auth.ts's profile() -> profile.picture). Adapter-owned: it is
  // read/written during sign-in, so Profile images (034) MUST NOT store an
  // uploaded avatar here -- a later Google sign-in would clobber it. Kept
  // as the SECOND choice in the avatar precedence (avatarImage ?? image ??
  // gradient block).
  image: text("image"),
  // Profile images (034)/FR-005/FR-006: the user's UPLOADED avatar (a Blob
  // URL), distinct from `image` (Google, adapter-owned) so removing an
  // upload reveals the Google photo rather than losing it. NULL = no upload;
  // the avatar then falls through to `image`, then to the `avatarColor`
  // gradient block. Resolved by the shared Avatar component, never per-site.
  avatarImage: text("avatarImage"),
  // Only set for accounts created via the Credentials (native) provider;
  // null for accounts that only ever signed in through Google. This null
  // is load-bearing, not incidental: auth.ts's `if (!user?.passwordHash)
  // return null` is what stops a Google account being logged into with a
  // guessed password, and Password reset (033) reads it as the definition
  // of "this account uses Google" (FR-005).
  passwordHash: text("passwordHash"),
  // Password reset (033)/FR-013, ADR 0010: every JWT issued before this
  // instant is refused. Sessions are JWTs (auth.ts), so there are no
  // session rows to delete -- revocation can only work by dating them.
  //
  // NULL means "never revoked" and MUST stay the default: backfilling
  // now() would sign out every user on the site at deploy.
  sessionsValidAfter: timestamp("sessionsValidAfter", { mode: "date" }),
  // Connect Steam (038, ADR 0012): the verified SteamID64 from a Steam
  // OpenID handshake run from account settings -- a settings-time account
  // LINK, never a sign-in provider, so it lives here on `user` and not in
  // the Auth.js adapter's `account` table. UNIQUE so one Steam account maps
  // to at most one playm8z account; NULL = not connected. Written only by
  // the connect callback and cleared by the disconnect action.
  steamId: text("steamId").unique(),
  steamConnectedAt: timestamp("steamConnectedAt", { mode: "date" }),
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
  // DEPRECATED / RETIRED (042, ADR 0015): was onboarding's flat game snapshot,
  // but the profile/matching/public-profile all read `userGames`, which is now
  // the single source of truth -- onboarding reconciles into it and a one-time
  // backfill seeded it from here. NO product code reads or writes this column
  // any more; kept in place (not dropped) so nothing is destroyed. Dropping it
  // is a separate, later cleanup (docs/future-work.md).
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
  // Admin Users (016) -- the only severe account action this feature
  // offers (no separate "Delete", ADR 0005/research.md #1). "Flagged"
  // is never stored -- always computed from open `reports` rows.
  bannedAt: timestamp("bannedAt", { mode: "date" }),
  // Admin Settings (024) -- extends the 2-tier admin model (moderator|
  // admin) every existing require-role.ts('moderator') gate already
  // used, to 5 tiers: user < support/viewer < moderator < admin
  // (research.md #5). `support`/`viewer` are assignable and persisted
  // but functionally identical to a plain `user` at every existing
  // gate -- no feature differentiates them further yet.
  role: text("role").notNull().default("user"),
  // Owner marker (041, ADR 0014): the single site owner. DELIBERATELY
  // orthogonal to `role` (the owner keeps role='admin'), so no existing
  // role check changes -- this flag only unlocks owner-only actions (the
  // scoped hard-delete exception to ADR 0005). Defaults false; provisioned
  // directly on the account (scripts/set-owner.ts), never via the admin UI.
  isOwner: boolean("isOwner").notNull().default(false),
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

// Singleton config row. Error Pages (002) only read/wrote
// maintenanceMode/maintenanceMessage; Admin Settings (024) is this
// table's real owner and extends it here with every other section's
// toggles (research.md #1 there), exactly as 002's own data-model.md
// anticipated -- never a second, competing config table. Remains a
// singleton row -- every settings-save Server Action only ever UPDATEs
// it, never inserts a second one.
export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  maintenanceMode: boolean("maintenanceMode").notNull().default(false),
  maintenanceMessage: text("maintenanceMessage"),
  // General -- no current reader (nav/footer/theming are Design System
  // infra, out of this feature's scope, same as every prior feature's
  // own disclaimer).
  siteName: text("siteName").notNull().default("playm8z"),
  tagline: text("tagline"),
  supportEmail: text("supportEmail"),
  defaultTheme: text("defaultTheme").notNull().default("dark"),
  // Moderation & auto-flag -- read by auto-flag-rules.ts (017/018)
  // instead of its own hardcoded constants (research.md #3).
  phraseFilterEnabled: boolean("phraseFilterEnabled").notNull().default(true),
  linkFilterEnabled: boolean("linkFilterEnabled").notNull().default(true),
  boostFilterEnabled: boolean("boostFilterEnabled").notNull().default(true),
  newAccountReviewEnabled: boolean("newAccountReviewEnabled").notNull().default(true),
  bannedPhrases: text("bannedPhrases").array().notNull().default(["free nitro", "cheap boosting", "click here", "dm for rates", "gift-nitro"]),
  // Gates the computed auto-hide rule (research.md #2) -- never a
  // stored per-row "hidden" flag; Home's/Browse's/Forum index's own
  // queries (003/004/009) re-evaluate this live on every read.
  autoHideEnabled: boolean("autoHideEnabled").notNull().default(false),
  autoHideThreshold: integer("autoHideThreshold").notNull().default(3),
  // low|med|high -- read by 017's/018's/019's queue queries for the
  // computed "needs ban review" display badge (research.md #4). Never
  // triggers an automated ban.
  autoEscalateSeverity: text("autoEscalateSeverity").notNull().default("high"),
  // Feature flags -- only `openSignups` gets real enforcement (001's
  // sign-up path); the rest are stored but inert (research.md #8),
  // logged to docs/future-work.md.
  discordFlag: boolean("discordFlag").notNull().default(false),
  groupsFlag: boolean("groupsFlag").notNull().default(false),
  ratingsFlag: boolean("ratingsFlag").notNull().default(false),
  forumFlag: boolean("forumFlag").notNull().default(true),
  tabletopFlag: boolean("tabletopFlag").notNull().default(true),
  openSignups: boolean("openSignups").notNull().default(true),
  // Safety -- initializes a brand-new user's own `privacyDiscoverable`
  // (007) at account creation (001); has no further effect until a
  // future discovery/search feature consults `privacyDiscoverable`
  // itself.
  discoverableByDefault: boolean("discoverableByDefault").notNull().default(true),
  // Lists (030) -- the genres offered on Post a Game and Browse. The
  // default is exactly the list that used to be hardcoded, so behavior
  // is unchanged until an admin edits it. `postings.genre` is plain
  // text with no FK to this, deliberately: retiring a genre here must
  // never touch a posting that already uses it (030 FR-007).
  genres: text("genres").array().notNull().default(["FPS", "RPG", "Co-op PvE", "Party", "MOBA", "Sandbox", "TTRPG", "Tabletop"]),
  // Lists (031) -- the games offered at onboarding's games step. A
  // SUGGESTION list, never a catalog: a player's own games are free text
  // (ADR 0001) and are never validated against this. Removing one here
  // has no effect on any player's profile.
  //
  // The default is an explicit `sql` literal rather than a JS array
  // because drizzle-kit does NOT escape apostrophes when it generates an
  // array default: `.default([... "Baldur's Gate 3" ...])` emits invalid
  // DDL and the push dies with `syntax error at or near "s"`, leaving
  // the column simply absent. Postgres escapes a quote by doubling it,
  // hence `Baldur''s`. `genres` above dodges this only because none of
  // its values contain an apostrophe.
  suggestedGames: text("suggestedGames")
    .array()
    .notNull()
    .default(
      sql`ARRAY['Valorant','Helldivers 2','Baldur''s Gate 3','CS2','Deep Rock Galactic','Lethal Company','Sea of Thieves','League of Legends','Overwatch 2','Minecraft','Elden Ring','D&D 5e','Catan','Magic: The Gathering']::text[]`,
    ),
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
  // any|18-29|30-49|50plus (ADR 0009) -- a demographic range describing
  // who the party is FOR, not a minimum age, and never an access
  // control. Rows created before ADR 0009 still hold the legacy 18|21
  // and are deliberately never rewritten; they expire within 30 days
  // (ADR 0003). Note `users.ageGroup` is a DIFFERENT thing and is still
  // 18|21 (ADR 0002) -- same name, different vocabulary, on purpose.
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
  // Admin Users (016) -- a moderation-hide flag, never a real delete
  // (ADR 0005). Home's/Browse's own open-postings queries exclude rows
  // where this is set (research.md #2); never cleared once set.
  removedAt: timestamp("removedAt", { mode: "date" }),
  // Admin Postings (017) -- set once at creation by create-posting.ts's
  // fixed, deterministic ruleset (research.md #2); never changed by
  // this feature directly.
  autoFlagReason: text("autoFlagReason"),
  // Admin Postings (017) -- set by Approve/Warn (queue-exit without
  // removal); left null by Remove/Ban, which exit the queue via
  // removedAt instead. Never cleared once set.
  moderationReviewedAt: timestamp("moderationReviewedAt", { mode: "date" }),
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
  // Public Profile (022) -- `applicant` (default, every existing/normal
  // row) | `host` (a host-initiated "Invite to a party" row via
  // invite-to-party.ts). `applicantId` always means "who joins the
  // roster" regardless of who initiated the row; this field only
  // determines which party is authorized to accept/decline it
  // (accept-request.ts/decline-request.ts's amended ownership check).
  initiatedBy: text("initiatedBy").notNull().default("applicant"),
  // Landing page (026) -- set once by accept-request.ts alongside its
  // existing status='accepted' write; `createdAt` is when the request
  // was SUBMITTED, this is when it was ACCEPTED, needed for "parties
  // formed this week." Never set for pending/declined/withdrawn rows,
  // never cleared afterward.
  acceptedAt: timestamp("acceptedAt", { mode: "date" }),
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
  // Admin Reports (019) -- retroactively added so its "resolved
  // today"/"avg response" stats have a real timestamp to read; 017's
  // and 018's own resolve actions gain a one-line `resolvedAt: now()`
  // alongside their existing `status = 'resolved'` write (research.md
  // #5). Never cleared once set.
  resolvedAt: timestamp("resolvedAt", { mode: "date" }),
});

// Forum index (009) -- this feature's first writer. `categoryId` is
// one of the six hardcoded keys in src/lib/forum/categories.ts, not a
// foreign key (categories aren't a table). `pinned` is moderator-
// controlled -- this feature only ever inserts `false` and never
// changes it afterward (no feature currently sets it). `locked` is
// also moderator-controlled and inserted `false` here; Admin Forum
// (018) is its first real writer ("🔒 Lock thread") -- reused as-is
// rather than adding a redundant `lockedAt` timestamp column (018's own
// data-model.md sketched one before checking this boolean already
// existed for exactly this purpose; a plain boolean already satisfies
// every real requirement -- rejecting new replies -- with nothing
// anywhere needing to know *when* a thread was locked). `replyCount`/
// `viewCount`/`likes` all start at 0 and are maintained by the future
// Forum Thread feature, not this one.
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
  // Admin Users (016) -- same moderation-hide pattern as
  // postings.removedAt; Forum index's own thread query excludes rows
  // where this is set (research.md #2). Never cleared once set.
  removedAt: timestamp("removedAt", { mode: "date" }),
  // Admin Forum (018) -- set once at creation by create-thread.ts's
  // shared auto-flag ruleset; never changed by this feature directly.
  autoFlagReason: text("autoFlagReason"),
  // Admin Forum (018) -- set by Approve/Warn (queue-exit without
  // removal). Never cleared once set.
  moderationReviewedAt: timestamp("moderationReviewedAt", { mode: "date" }),
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
  // Admin Forum (018) -- forumThreads got a moderation-hide `removedAt`
  // from Admin Users (016), but this table never did (016 only
  // extended forumThreads). Set by "Remove reply"; Forum Thread's own
  // get-thread.ts excludes rows where this is set from a thread's reply
  // list. Never cleared once set.
  removedAt: timestamp("removedAt", { mode: "date" }),
  // Admin Forum (018) -- same taxonomy/pattern as forumThreads' own
  // fields above, set at creation by post-reply.ts's shared auto-flag
  // ruleset.
  autoFlagReason: text("autoFlagReason"),
  moderationReviewedAt: timestamp("moderationReviewedAt", { mode: "date" }),
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
// `targetType` values: `thread` | `reply` (010-forum-thread), plus
// `newsPost` (023-news-article-detail, its third consumer of this
// already-polymorphic shape -- no schema change needed for that one).
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
  // Admin Reports (019) -- this feature's own moderation-hide capability
  // (research.md #4); no prior feature needed message moderation.
  // Inbox's own conversation-view query excludes rows where this is
  // set (same ADR-0005-consistent pattern as postings/forumThreads/
  // forumReplies' own `removedAt`). Never cleared once set.
  removedAt: timestamp("removedAt", { mode: "date" }),
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

// News feed (013) -- this feature's own minimal, read-only shape
// (data-model.md); Admin News (020) is the canonical writer and
// extends this table with `body`/`status` for its own authoring needs,
// same "define the minimal shape now" pattern as Home's original
// `postings` before Post a Game existed. `category` is one of five
// hardcoded values (research.md #2), not a foreign key. `featured` is
// Admin News' own "pin" -- that feature enforces at most one featured
// post at a time; `upcoming` is still never written by any feature.
export const newsPosts = pgTable("newsPosts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  category: text("category").notNull(),
  cover: text("cover"),
  readTimeMinutes: integer("readTimeMinutes"),
  featured: boolean("featured").notNull().default(false),
  upcoming: boolean("upcoming").notNull().default(false),
  publishedAt: timestamp("publishedAt", { mode: "date" }).notNull().defaultNow(),
  // Admin News (020) -- this feature's own first real writer of this
  // table. `body` is full markdown content (plain text, not a rich
  // document -- research.md #4); `status` is one of
  // draft|published|scheduled, defaulting to draft so a brand-new post
  // never appears live before an explicit publish/schedule action.
  body: text("body").notNull().default(""),
  status: text("status").notNull().default("draft"),
  // News Article detail (023) -- generated once, at creation, by
  // Admin News' (020) amended save-news-post.ts (research.md #2);
  // never regenerated on a later title edit, so a shared/bookmarked
  // article URL stays stable (the same reasoning as handle
  // immutability). No default -- every pre-023 row is verified empty.
  slug: text("slug").notNull().unique(),
  // News Article detail (023) -- spec.md's own FR-001 requires
  // rendering tags, but neither `013` nor `020` ever added a column or
  // editor field for them (a real gap, not a deliberate deferral like
  // `readTimeMinutes`). Added here with a small, bounded amendment to
  // `020`'s own editor (a plain comma-separated input, matching Forum
  // index's `tags` input exactly) -- unlike read time, tags genuinely
  // have no way to be computed from existing data, so a stored,
  // moderator-set column is the correct shape, not a "leave it
  // unpopulated" resolution.
  tags: text("tags").array().notNull().default([]),
});

// News feed (013) -- this feature's only writer. No relationship to
// `user` -- subscribing needs no account (research.md #3), this
// project's first write action with no auth check at all. `email`'s
// database-level unique constraint (not an application-level check)
// is the actual duplicate-prevention mechanism, same reasoning as
// `likes`' own unique constraint.
export const newsletterSubscribers = pgTable("newsletterSubscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Content Page (014) -- this feature's only writer, for an EXISTING
// page's content/blocks/status; creating a new page (choosing its
// slug) is the future Admin Content Pages feature's job, extending
// this same table. `blocks` is a single ordered JSONB array, not a
// normalized per-block table, since every read/write always touches
// the whole array as one atomic unit (research.md #1) -- array
// position is the rendering order, no separate `order` column.
export const contentPages = pgTable("contentPages", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  blocks: jsonb("blocks").notNull().default([]).$type<ContentBlock[]>(),
  status: text("status").notNull().default("draft"),
  system: boolean("system").notNull().default(false),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export type ContentBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "callout"; text: string }
  | { type: "divider" };

// Admin Dashboard (015) -- append-only audit trail (data-model.md),
// feeding the dashboard's recent-activity feed. Shipped with no real
// callers; Admin Postings (017) is its first real writer
// (Approve/Remove/Warn), and also retroactively wires Admin Users'
// (016) own toggle-user-ban.ts/remove-user-content.ts to it, closing
// the gap this table's own spec always anticipated. `actorId` null
// means a system-generated entry. Never updated or deleted once
// written -- this table *is* the project's audit trail, so ADR 0005's
// "disable instead of delete" doesn't apply in reverse here.
export const auditEntries = pgTable("auditEntries", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actorId").references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  category: text("category").notNull(),
  targetType: text("targetType"),
  targetId: uuid("targetId"),
  targetLabel: text("targetLabel"),
  reason: text("reason"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Admin Postings (017) -- introduced with a posting-specific `postingId`
// column ("first feature that needs a shared entity defines its minimal
// shape," the same pattern used for Notification/AuditEntry). Admin
// Forum (018) is the third distinct source (after postings and now
// threads/replies) -- exactly the trigger 017's own research.md #3
// anticipated ("generalize if a third distinct source appears") -- so
// `postingId` is generalized here to a polymorphic `targetType`/
// `targetId` pair, matching `reports`/`likes`'s existing shape rather
// than adding more mutually-exclusive nullable FK columns. `targetId`
// has no FK constraint (it names a row in whichever table `targetType`
// says), same reasoning as `reports.targetId`. Every pre-existing row
// implicitly becomes `targetType = 'posting'`. Append-only -- never
// updated or deleted (ADR 0005).
export const warnings = pgTable("warnings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  moderatorId: uuid("moderatorId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: text("targetType"),
  targetId: uuid("targetId"),
  reason: text("reason"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Public Profile (022) -- a simple, asymmetric social relation, hard-
// deleted on unfollow (research.md #4 -- the same "no trust/safety
// history value" exception already applied to `SavedListing`/`Likes`/
// `ThreadSubscription`, not `Blocks`' soft-preserved pattern; a follow
// carries no moderation significance the way a block does).
// Re-following after an unfollow creates a new row.
export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("followerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: uuid("followeeId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (follow) => [unique().on(follow.followerId, follow.followeeId)],
);

// Public Profile (022) -- ships the read-only entity and its own
// display (rating average, review count, review list) with NO writer
// yet, the same "ship the entity/display now, adopt the write
// mechanism later" pattern already used for `Notification`/
// `AuditEntry` (research.md #6). The post-session rating-submission
// flow that would write here remains deferred platform-wide
// (docs/future-work.md).
export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  revieweeId: uuid("revieweeId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  text: text("text"),
  // Free text, matching this project's game-as-keyword approach (ADR 0001).
  game: text("game"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// News Article detail (023) -- deliberately NOT a generalization of
// `savedListings` (research.md #4): with only two total consumers
// (postings, now news posts), this doesn't yet meet the "generalize
// when a THIRD real consumer appears" bar this project applied to
// `warnings`' own polymorphic generalization. Unsaving deletes the
// row -- no trust/safety history value, same exception as
// `savedListings`/`likes`/`follows`.
export const savedNewsPosts = pgTable(
  "savedNewsPosts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    newsPostId: uuid("newsPostId")
      .notNull()
      .references(() => newsPosts.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.newsPostId)],
);

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

// Password reset (033). Deliberately NOT stored in `verificationToken`
// above, and the reason is a security one rather than tidiness: that table
// is (identifier, token, expires) with no purpose column, and
// /api/auth/verify-email matches a row on identifier+token alone. Sharing
// it would make the two token kinds interchangeable -- a *verification*
// token could be posted to the reset endpoint to set a password, i.e.
// account takeover using a token minted for a weaker purpose. It would
// also collide with update-email.ts, which writes a verification token
// keyed on the new address (research.md #1).
export const passwordResetTokens = pgTable(
  "passwordResetToken",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Keyed on the ACCOUNT, not the address (verificationToken keys on the
    // address). An email can change; a link issued beforehand must still
    // resolve to the account it was issued for rather than dangling or
    // silently retargeting.
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // SHA-256 of the raw token. The raw value exists ONLY in the emailed
    // link and is never stored: a live reset token is a credential to take
    // over the account, so a leaked/queried row must be inert (FR-012).
    // Unique because lookup is by hash alone -- possession of the token is
    // the entire proof, there is no identifier to pair it with.
    //
    // SHA-256 rather than bcrypt on purpose: bcrypt is slow to defend
    // LOW-entropy human passwords. A 32-byte random token has nothing to
    // brute-force, so a slow hash would buy nothing and cost latency.
    tokenHash: text("tokenHash").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
    // Marked, never deleted (ADR 0005). Also keeps "already used"
    // distinguishable from "never existed" server-side for audit, while
    // both stay identical to the user (FR-018).
    usedAt: timestamp("usedAt", { mode: "date" }),
    // Carries FR-020's throttle as well as ordering -- which is why this
    // feature needs no rate-limiting infrastructure: the row we must
    // already consult for FR-009's supersede is the rate limiter.
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("passwordResetToken_userId_idx").on(table.userId)],
);

// Game headline images (035), ADR 0011. A LIGHTWEIGHT layer over free-text
// games -- NOT the curated catalog ADR 0001 rejected. `postings.game` stays
// free text and references nothing here; a game name absent from this table
// still posts, browses, and trends -- it just gets a generated visual
// instead of a curated image. This table only attaches an optional image
// (and aliases) to a name. See docs/adr/0011-game-image-alias-layer.md.
export const games = pgTable("game", {
  id: uuid("id").defaultRandom().primaryKey(),
  // The canonical display name ("D&D 5e").
  name: text("name").notNull(),
  // lower(trim(name)) -- the match key, and it MUST equal how get-trending
  // groups game names, or image lookup and Trending grouping disagree about
  // what "the same game" is (research.md #3). Unique: no two games claim one
  // name (FR-012).
  normalizedName: text("normalizedName").notNull().unique(),
  // The admin headline image (a Blob URL). NULL = no curated image; the name
  // resolves to a deterministic generated visual instead. So "has a row" is
  // NOT "has an image".
  imageUrl: text("imageUrl"),
  // Soft-disable (ADR 0005) -- non-null excludes the game from resolution
  // (its name falls back to the generated visual); its postings, which never
  // referenced it, are unaffected. Never hard-deleted.
  disabledAt: timestamp("disabledAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// A normalized spelling variant mapping to exactly one game (FR-015). Used
// ONLY for image resolution -- never to merge Trending counts (that would
// change ADR 0001's grouping and is out of scope). Alias-vs-alias
// uniqueness is this unique index; alias-vs-name (an alias must not equal
// any game's own name) is an application check at write time, following the
// handle-uniqueness precedent.
export const gameAliases = pgTable(
  "gameAlias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    normalizedAlias: text("normalizedAlias").notNull().unique(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("gameAlias_gameId_idx").on(table.gameId)],
);

// An unmatched game string the admin reviewed and chose NOT to alias. Keeps
// rejected AI suggestions from reappearing on the next run (US4 scenario 3).
// Not user-facing; consulted only by the suggestion query to exclude it.
export const gameAliasDismissals = pgTable("gameAliasDismissal", {
  id: uuid("id").defaultRandom().primaryKey(),
  normalizedName: text("normalizedName").notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
