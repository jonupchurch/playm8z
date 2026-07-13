# Phase 1 Data Model: Public Profile

## Follows (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `followerId` | uuid, not null, references `user.id` | Who follows. |
| `followeeId` | uuid, not null, references `user.id` | Who is followed. |
| `createdAt` | timestamp, not null, default now | |

A unique constraint on `(followerId, followeeId)` prevents a
duplicate active follow. Unfollowing deletes the row (research.md #4
— no trust/safety history value, same exception as `SavedListing`/
`Likes`/`ThreadSubscription`).

## Reviews (new table, no writer yet — research.md #6)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `revieweeId` | uuid, not null, references `user.id` | Who's being reviewed. |
| `reviewerId` | uuid, not null, references `user.id` | Who wrote it. |
| `rating` | integer, not null | 1-5. |
| `text` | text, nullable | |
| `game` | text, nullable | Free text, matching this project's game-as-keyword approach (ADR 0001). |
| `createdAt` | timestamp, not null, default now | |

This feature only reads from it (rating average, count, list); the
post-session rating-submission flow that would write here remains
deferred (`docs/future-work.md`).

## Applications (extends `006-listing-detail`'s existing table)

| Field | Type | Notes |
|---|---|---|
| `initiatedBy` | text, not null, default `applicant` | New. `applicant` \| `host`. Existing/future normal applications (`006`'s `create-application.ts`) always write `applicant`, unchanged. This feature's `invite-to-party.ts` writes `host`. |

No other change to `applications`' existing shape (`postingId`,
`applicantId`, `message`, `status`, `createdAt`) — `applicantId`
always means "who joins the roster," regardless of who initiated the
row.

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `followeeId` (toggle-follow) | `z.string().uuid()`, refined: must not equal the acting user's own id |
| `postingId` (invite) | `z.string().uuid()`, refined: the acting user must currently host it, it must be `open`, and have `seatsOpen > 0` |
| `invitedUserId` | `z.string().uuid()`, refined: must not equal the acting user's own id |

## Computed values (no new tables — Principle "computed over stored")

| Value | Source |
|---|---|
| `sessions` stat | `COUNT(applications WHERE applicantId = user AND status = 'accepted')` + `COUNT(postings WHERE hostId = user AND status IN ('full','closed'))` (research.md #2) |
| Mutual follows | Intersection of `follows` rows where `followerId = viewer` and where `followerId = profileOwner`, joined on `followeeId` (research.md #5) |
| Shared games | Intersection of `viewer.gamesPlayed` and `profileOwner.gamesPlayed` (both existing `text[]` columns from `001`) |

## State notes

- `follows` rows are inserted/deleted directly (toggle), never
  transitioned through a status field.
- `reviews` rows are append-only once a future feature writes them;
  this feature never writes any.
- `applications.initiatedBy` is set once, at insert, and never
  changed afterward — it only ever determines which party is
  authorized to accept/decline that specific row (`011`'s amended
  ownership check).
