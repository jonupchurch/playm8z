# Phase 1 Data Model: Forum index

## ForumThread (new table — this feature's first writer)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `categoryId` | text, not null | One of the six hardcoded category keys (research.md #1) — not a foreign key, since categories aren't a table. |
| `authorId` | uuid, not null, references `user.id` | |
| `title` | text, not null | |
| `body` | text, not null | |
| `tags` | text[], not null, default `[]` | Free-text, same convention as `postings.tags`. |
| `pinned` | boolean, not null, default false | Moderator-controlled; this feature only ever writes `false` on create and never changes it afterward — the future Admin Forum feature owns setting it `true`. |
| `locked` | boolean, not null, default false | Same as `pinned` — read-only from this feature's own perspective. |
| `replyCount` | integer, not null, default 0 | Maintained by the future Forum Thread feature (replying increments it); this feature only initializes it to `0`. |
| `viewCount` | integer, not null, default 0 | Maintained by the future Forum Thread feature; initialized to `0` here. |
| `likes` | integer, not null, default 0 | Same — initialized to `0`, maintained elsewhere. |
| `createdAt` | timestamp, not null, default now | |

No relationships beyond `authorId`. No soft-delete concern (ADR 0005)
surfaces directly in this feature's own scope — this feature never
removes or disables a thread; that's Admin Forum's job when it exists.

## Category (not stored — hardcoded)

```text
general   — "General"             (dot #ffb000)
lfg       — "Looking for Group"   (dot #4ec96a)
gametalk  — "Game Talk"           (dot #35d0e0)
tabletop  — "Tabletop & TTRPG"    (dot #ff3b6b)
groups    — "Groups & Clans"      (dot #ff6b1a)
offtopic  — "Off-Topic"           (dot #b49c6a)
```

## HOT heuristic (computed, not stored — research.md #3)

A thread is "hot" (for display only) when its `replyCount` divided by
its age in hours exceeds a fixed threshold among currently-listed
threads — an implementation detail to tune at build time, not fixed
by this document. Never shown alongside `pinned = true` (pinned takes
precedence, per spec FR-005).

## Validation rules (Zod, at the `searchParams`/Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `category` | `z.enum(["all", ...the six category keys]).default("all")` |
| `q` (search) | `z.string().max(200).optional()` |
| `sort` | `z.enum(["latest", "top", "unanswered"]).default("latest")` |
| `categoryId` (create) | `z.enum([the six category keys])` |
| `title` (create) | `z.string().trim().min(1).max(120)` |
| `body` (create) | `z.string().trim().min(1).max(5000)` |
| `tags` (create) | comma-split → `z.array(z.string().max(30)).max(6)` |

## State notes

- `pinned`/`locked` transition only via the future Admin Forum feature
  — this feature never touches either after insert.
- `replyCount`/`viewCount`/`likes` all start at `0` and are maintained
  by the future Forum Thread feature, not this one.
