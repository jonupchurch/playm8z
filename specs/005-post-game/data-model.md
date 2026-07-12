# Phase 1 Data Model: Post a Game

## Postings (extends the table from `003-home`, further extended by `004-browse`)

This feature is the entity's canonical writer and adds the last fields
this form collects; every other column was already established by Home
and Browse.

| Field | Type | Notes |
|---|---|---|
| `tags` | text[], not null, default `[]` | Free-text keywords, comma-split from the form's single input, capped at 6 entries. |
| `recurring` | boolean, not null, default false | Descriptive only (spec Assumptions) — does not generate additional postings. |
| `voiceLink` | text, nullable | Plain text (e.g. a Discord invite URL); no format verification or integration beyond storing it. |

All fields established by `003-home` (`hostId`, `game`, `title`,
`blurb`, `vibe`, `region`, `seatsTotal`, `seatsOpen`, `status`,
`createdAt`) and `004-browse` (`genre`, `ageGroup`, `timeSlots`,
`platform`, `micRequired`, `scheduledDate`) remain unchanged. This
feature writes `status = "open"` unconditionally on create (FR-015) —
no other status is ever set by this feature.

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `game` | `z.string().trim().min(1).max(100)` |
| `genre` | `z.enum([the 8 genre values]).optional()` |
| `title` | `z.string().trim().min(1).max(60)` |
| `blurb` (description) | `z.string().max(240).optional()` |
| `tags` | comma-split input → `z.array(z.string().max(30)).max(6)` |
| `vibe` | `z.enum(["fun", "serious"]).default("fun")` |
| `platform` | `z.enum(["pc", "console", "cross", "table"])` |
| `region` | `z.enum([the 6 region values])` |
| `ageGroup` | `z.enum(["18", "21"]).default("18")` — never `13`, per ADR 0002 |
| `timeSlots` | `z.array(z.enum([the 5 slot values])).optional()` |
| `scheduledDate` | `z.coerce.date().optional()` |
| `recurring` | `z.boolean().default(false)` |
| `seatsTotal` (Group size) | `z.number().int().min(2).max(8)` |
| `seatsOpen` (Spots open) | `z.number().int().min(1)`, refined against `seatsTotal`: must be `≤ seatsTotal - 1` (research.md #5) |
| `micRequired` | `z.boolean().default(false)` |
| `voiceLink` | `z.string().max(300).optional()` |

## State notes

- `status` is always written as `open` by this feature (FR-015); other
  features (accepting a roster slot, closing/expiring per ADR 0003)
  are what transition it to `full`/`closed` later.
- No soft-delete concern (ADR 0005) in this feature's own scope — it
  only ever inserts, never deletes or disables.
