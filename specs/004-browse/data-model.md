# Phase 1 Data Model: Browse

## Postings (extends the table from `003-home`)

Home defined the minimal shape; this feature adds the columns its own
facets need. The future Post a Game feature remains this entity's
canonical writer and may extend it further (recurring, voice link,
tags) for its own needs — same shared-table pattern used throughout.

| Field | Type | Notes |
|---|---|---|
| `genre` | text, not null | One of: `FPS`, `RPG`, `Co-op PvE`, `Party`, `MOBA`, `Sandbox`, `TTRPG`, `Tabletop` — an extensible, bounded set (guidelines.md's Game entity comment), distinct from the free-text `game` field. |
| `ageGroup` | text, not null | One of `18` \| `21` only — ADR 0002, never `13` (supersedes the wireframe's 13+/18+/21+ facet). |
| `timeSlots` | text[], not null | One or more of: `morning`, `afternoon`, `evening`, `late`, `weekend`. |
| `platform` | text, not null | One of: `pc`, `console`, `cross`, `table`. |
| `micRequired` | boolean, not null, default false | |
| `scheduledDate` | timestamp, nullable | Optional. Drives "Soonest" sort (research.md #1 in `003-home`'s successor reasoning; see this spec's Assumptions) — `null` sorts after any posting that has a value. |

All fields Home already defined (`hostId`, `game`, `title`, `blurb`,
`vibe`, `region`, `seatsTotal`, `seatsOpen`, `status`, `createdAt`)
remain unchanged.

## Facet option counts

Not stored entities. Computed per request:
- **Game facet options**: `SELECT DISTINCT game, COUNT(*)` over rows
  where `status = open`, grouped by `game`.
- **Region facet options**: same shape, grouped by `region`, over the
  full 6-value region set (some may have a count of `0`).

## Validation rules (Zod, at the `searchParams` boundary — Principle II)

| Field | Rule |
|---|---|
| `q` (keyword) | `z.string().max(200).optional()` |
| `vibe` | `z.enum(["any", "fun", "serious"]).default("any")` |
| `games` | `z.array(z.string().max(100)).max(20).optional()` — free-text per ADR 0001, but length- and count-capped defensively |
| `genres` | `z.array(z.enum([...8 genre values])).max(8).optional()` |
| `regions` | `z.array(z.enum([6 region values])).max(6).optional()` |
| `timeSlots` | `z.array(z.enum([5 slot values])).max(5).optional()` |
| `ageGroup` | `z.enum(["any", "18", "21"]).default("any")` |
| `openSlots` | `z.enum(["any", "1", "2", "3"]).default("any")` |
| `platform` | `z.enum(["any", "pc", "console", "cross", "table"]).default("any")` |
| `micRequired` | `z.coerce.boolean().default(false)` |
| `sort` | `z.enum(["recent", "seats", "soon"]).default("recent")` |

## State notes

- Same as Home: `status` transitions are driven by other features;
  Browse only ever reads `status = open` rows, never writes.
- No soft-delete concern (ADR 0005) surfaces in this feature's own
  scope, same as Home.
