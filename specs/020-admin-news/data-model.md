# Phase 1 Data Model: Admin News

## NewsPost (extends `013-news-feed`'s existing table — this feature is its first real writer)

| Field | Type | Notes |
|---|---|---|
| `body` | text, not null, default `''` | New. Full post content, plain markdown (research.md #4). |
| `status` | text, not null, default `draft` | New. One of `draft` \| `published` \| `scheduled`. |

Reused unchanged from `013`: `id`, `title`, `excerpt`, `category`,
`cover`, `readTimeMinutes`, `featured`, `upcoming`, `publishedAt`.
`featured` is this feature's "pin" (research.md #2); `013`'s own
data-model already assigned this feature responsibility for the
at-most-one-featured invariant.

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `title` | `z.string().trim().min(1).max(120)` |
| `excerpt` | `z.string().trim().min(1).max(120)` (matches the input's existing `maxlength`) |
| `body` | `z.string().max(20000)` |
| `category` | `z.enum(["Announcement", "Update", "Event", "Community", "Patch Notes"])` (`013`'s existing fixed set) |
| `cover` | `z.string()` (a gradient/color token, same shape `013` already reads) |
| `action` (save) | `z.enum(["publish", "schedule", "save-draft", "delete"])` |
| `publishDate` (schedule only) | `z.coerce.date()`, refined: required and in the future when `action = "schedule"` |
| `featured` | `z.boolean().default(false)` |
| `postId` (update/delete) | `z.string().uuid().optional()` (absent = create) |

## State notes

- `status` transitions freely among `draft`/`published`/`scheduled`
  via `save-news-post.ts`'s `action` discriminator (research.md #1) —
  no restricted state machine beyond what each `action` explicitly
  requests.
- `publishedAt` is set to now on a genuine `draft`/new → `published`
  transition only; an already-`published` post's `publishedAt` is
  preserved on further edits (research.md #5); a `schedule` action
  sets it to the entered future date instead.
- `featured` is exclusive across all rows — setting it on one row
  clears it on whichever row previously had it, in the same
  transaction (research.md #2).
- No soft-delete concern beyond the existing `status` enum — "Delete"
  is `status → draft` (ADR 0005), not a new column or a row removal.
