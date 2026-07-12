# Phase 1 Data Model: Home

## Postings (new table, minimal shape)

Home is the first feature that needs this table, so it defines the
minimal shape its own FRs require. The future "Post a Game" feature
(guidelines.md §7.3) extends this same table with its own additional
columns (ageGroup, timeSlots, platform, micRequired, scheduledDate,
recurring, voiceLink, tags) via its own migration when it's planned —
research.md #2.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `hostId` | uuid, not null, references `user.id` | The posting's creator. |
| `game` | text, not null | Free-text keyword, per ADR 0001 — not a foreign key to a catalog table. |
| `title` | text, not null | |
| `blurb` | text, not null | Short description shown on the card. |
| `vibe` | text, not null | One of `fun` \| `serious` (guidelines.md's documented Posting shape). |
| `region` | text, not null | One of the same 6 values as `user.region` (Auth & Onboarding's data-model.md): `na-east`, `na-west`, `eu-west`, `eu-east`, `asia`, `oceania`. Home's own quick-filter chips only surface `na-east`/`na-west`/`eu-west`/"Any," but the stored value isn't restricted to just those three. |
| `seatsTotal` | integer, not null | Party size. |
| `seatsOpen` | integer, not null | Open slots remaining; `0` implies `status` should be `full`. |
| `status` | text, not null, default `open` | One of `open` \| `full` \| `closed` (guidelines.md). Home only ever reads rows where `status = open` (FR-004). |
| `createdAt` | timestamp, not null, default now | Used for "Recent" sort and the card's relative post age. |

No relationships beyond `hostId` are needed for Home's own scope
(no roster, no applications, no Q&A — those belong to Listing detail
and Post a Game, per their own future specs).

## Trending aggregate

Not a stored entity. Computed per request: `GROUP BY game` over rows
where `status = open`, counting rows per distinct `game` value,
descending, top 5 (research.md #4).

## Validation rules (Zod, at the read boundary — Principle II)

Home does not write any Posting data, so there's no write-side
validation to define here. If search/filter state is ever reflected in
the URL as a query param, it gets a defensive shape check
(`z.string().optional()` for the search text; enum checks for vibe/
region/sort) before use — not because the data is untrusted in a
security sense (it only filters already-public data), but per
Principle II's "nothing crosses a trust boundary unchecked" default.

## State notes

- `status` transitions (`open` → `full`/`closed`) are driven by other
  features (accepting a roster slot fills it; closing/expiring per ADR
  0003) — Home only reads the current value, never writes it.
- No soft-delete concern (ADR 0005) surfaces in Home's own scope —
  Home never removes or disables a posting; it only filters by status.
