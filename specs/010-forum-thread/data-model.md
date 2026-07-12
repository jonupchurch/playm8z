# Phase 1 Data Model: Forum Thread

## ForumReply (new table — this feature's only writer)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `threadId` | uuid, not null, references `forumThreads.id` | |
| `authorId` | uuid, not null, references `user.id` | |
| `body` | text, not null | |
| `quotedReplyId` | uuid, nullable, references `forumReplies.id` | Self-referential; set when posted via "Quote." |
| `likes` | integer, not null, default 0 | Denormalized, recomputable from `likes` (below) — kept in sync on every like/unlike. |
| `createdAt` | timestamp, not null, default now | |

No `isBestAnswer` column (research.md #4). No soft-delete concern
surfaces in this feature's own scope — replies are never removed here
(a future Admin Forum feature would own that).

## Likes (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `userId` | uuid, not null, references `user.id` | |
| `targetType` | text, not null | `thread` (liking the original post) \| `reply`. |
| `targetId` | uuid, not null | A `forumThreads.id` or `forumReplies.id` depending on `targetType`. |
| `createdAt` | timestamp, not null, default now | |

A database-level unique constraint on `(userId, targetType, targetId)`
prevents double-liking even under a race (research.md #2). Unliking
deletes the row (a real delete — a like carries no audit/trust value
worth preserving, the same reasoning already applied to `SavedListing`/
`UserGame`), and decrements the denormalized count on the target.

## ThreadSubscription (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `userId` | uuid, not null, references `user.id` | |
| `threadId` | uuid, not null, references `forumThreads.id` | |
| `createdAt` | timestamp, not null, default now | |

Unsubscribing deletes the row (same reasoning as `Likes`). Nothing
currently reads this table to send a notification (research.md #5).

## Reports (reused from `008-blocked-users`, no schema change)

This feature writes `targetType = 'forum'` rows with `targetId` set to
either a `forumThreads.id` (reporting the thread itself) or a
`forumReplies.id` (reporting a specific reply) — the existing `reports`
table already supports this via its `targetType` enum.

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `body` (reply) | `z.string().trim().min(1).max(3000)` |
| `quotedReplyId` | `z.string().uuid().optional()` |
| `targetType` (like/report) | `z.enum(["thread", "reply"])` (`forum` used directly as the `reports.targetType` literal for this feature's writes) |
| `targetId` | `z.string().uuid()` |
| `reason` (report) | not collected by this feature either — same as Blocked Users, no reason taxonomy |

## State notes

- `likes` count on `forumThreads`/`forumReplies` is denormalized for
  fast reads and updated transactionally alongside each `likes` table
  insert/delete — the `likes` table itself remains the source of truth
  for "did this user like this."
- `reports.status` is written once as `open` by this feature (reusing
  `008`'s default) and never transitioned here.
