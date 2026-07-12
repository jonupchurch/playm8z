# Phase 1 Data Model: News feed

## NewsPost (new table, minimal shape — read-only from this feature)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `title` | text, not null | |
| `excerpt` | text, not null | |
| `category` | text, not null | One of the five hardcoded category keys (research.md #2 style — same "small fixed set" treatment as Forum's categories). |
| `cover` | text, nullable | A color/gradient token or image reference — display detail, not fixed here. |
| `readTimeMinutes` | integer, nullable | |
| `featured` | boolean, not null, default false | The future Admin News feature is responsible for ensuring at most one post is featured at a time — this feature just reads whichever (if any) currently is. |
| `upcoming` | boolean, not null, default false | Event-category posts only; admin-set, not derived from date math. |
| `publishedAt` | timestamp, not null, default now | |

No `body`/full-content column — this feature never renders a full
article (that's News article detail, already spec'd separately). The
future Admin News feature extends this table with whatever full-content
and authoring fields it needs.

## NewsletterSubscriber (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `email` | text, not null, unique | Database-level unique constraint prevents duplicates even under a race (research.md #3). |
| `createdAt` | timestamp, not null, default now | |

No relationship to `user` — subscribing doesn't require an account.

## Categories (not stored — hardcoded)

```text
Announcement
Update
Event
Community
Patch Notes
```

## Validation rules (Zod, at the `searchParams`/Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `category` | `z.enum(["all", ...the 5 category values]).default("all")` |
| `q` (search) | `z.string().max(200).optional()` |
| `page` | `z.coerce.number().int().min(1).default(1)` |
| `email` (subscribe) | `z.string().email().max(254)` |

## State notes

- `featured`/`upcoming` are never written by this feature — read-only,
  set by the future Admin News feature.
- `newsletterSubscribers` is append-only from this feature's own
  actions (no unsubscribe flow built here — out of scope, since no
  delivery exists yet to unsubscribe from).
