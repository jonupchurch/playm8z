# Phase 1 Data Model: Admin Users

## User (extends the table from `001-auth-onboarding`)

| Field | Type | Notes |
|---|---|---|
| `bannedAt` | timestamp, nullable | New. Set/cleared only by a moderator-or-higher user (`toggle-user-ban.ts`). Non-null means banned; "flagged" is computed separately (research.md #3) and never stored. |

## Postings (extends the table from `003-home`)

| Field | Type | Notes |
|---|---|---|
| `removedAt` | timestamp, nullable | New. Set only by a moderator-or-higher user (`remove-user-content.ts`). Home's and Browse's existing open-postings queries are amended to exclude rows where this is set (research.md #2). |

## ForumThread (extends the table from `009-forum-index`)

| Field | Type | Notes |
|---|---|---|
| `removedAt` | timestamp, nullable | New. Same pattern as `postings.removedAt`; Forum index's existing thread query is amended to exclude rows where this is set. |

## Reports (read from `008-blocked-users`, no schema change)

Read filtered to `targetType = 'user'` and `status = 'open'`, grouped
by `targetId`, to compute "flagged" status and the drawer's report
count.

## Validation rules (Zod, at the Server Action/`searchParams` boundary — Principle II)

| Field | Rule |
|---|---|
| `q` (search) | `z.string().max(200).optional()` |
| `status` (filter) | `z.enum(["all", "active", "flagged", "banned"]).default("all")` |
| `userId` (ban/unban) | `z.string().uuid()` |
| `contentType` (remove) | `z.enum(["posting", "forumThread"])` |
| `contentId` | `z.string().uuid()` |

## State notes

- `user.bannedAt` transitions null → timestamp (Ban) → null again
  (Unban), any number of times, only by a moderator-or-higher session.
- `postings.removedAt`/`forumThreads.removedAt` transition null →
  timestamp exactly (this feature never clears either — "un-removing"
  content isn't offered by this feature's own wireframe/scope).
- "Flagged" is never stored — always re-derived from current `reports`
  rows at read time.
