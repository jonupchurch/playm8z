# Phase 1 Data Model: News Article detail

## NewsPost (extends `013-news-feed`'s table, further extended by `020-admin-news`)

| Field | Type | Notes |
|---|---|---|
| `slug` | text, unique, not null | New. Generated once, at creation, by `020`'s amended `save-news-post.ts` (research.md #2). Immutable afterward. |

`readTimeMinutes` (existing, `013`) remains unused — this feature
computes read time from `body` instead (research.md #3).

## Likes (extends `010-forum-thread`'s existing table — no schema change)

`targetType` gains a third real value, `newsPost` (alongside
`010`'s existing `thread`/`reply`); `targetId` = a `newsPosts.id`.
This feature is `010`'s third consumer.

## SavedNewsPosts (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `userId` | uuid, not null, references `user.id` | |
| `newsPostId` | uuid, not null, references `newsPosts.id` | |
| `createdAt` | timestamp, not null, default now | |

A unique constraint on `(userId, newsPostId)` prevents duplicate
saves. Unsaving deletes the row (research.md #4 — same no-history
exception as `SavedListing`/`Likes`/`Follows`). NOT a generalization
of `SavedListing` — a deliberately separate, smaller table (research.md
#4).

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `newsPostId` (like/save) | `z.string().uuid()` |

## Computed values (no new tables)

| Value | Source |
|---|---|
| Read time | `Math.ceil(wordCount(body) / 200)` minutes, computed at render time (research.md #3) |
| "Is live" gate | `status = 'published'` OR (`status = 'scheduled'` AND `publishedAt` has passed) — same rule `020` added to `013`'s own query |
| "Keep reading" | Up to 3 other posts passing the same "is live" gate, most recent first, excluding the current post's id — reuses `013`'s existing query shape |

## State notes

- `newsPosts.slug` is written once, at creation, and never changed —
  even if `title` is edited afterward (research.md #2).
- `likes` rows (this feature's `targetType = 'newsPost'` rows) are
  inserted/deleted directly, same toggle behavior as `010`'s existing
  `thread`/`reply` likes.
- `savedNewsPosts` rows are inserted/deleted directly (toggle); no
  soft-delete concern (ADR 0005 doesn't apply — same exception as
  `SavedListing`).
