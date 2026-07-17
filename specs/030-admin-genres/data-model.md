# Phase 1 Data Model: Admin-editable Genres

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-16

## Changed entity: `settings` (existing singleton)

One additive column. `settings` is a one-row table (`src/db/schema.ts:98-139`) whose own comment
forbids "a second, competing config table".

| Field | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `genres` | `text[]` | NOT NULL | the eight genres in use today | Ordered. Order is presentation order (spec Assumptions). |

**Default value** (exactly today's list, so behaviour is unchanged until an admin edits — spec
Assumptions, "Seed content"):

```text
{FPS,RPG,"Co-op PvE",Party,MOBA,Sandbox,TTRPG,Tabletop}
```

**Why a default rather than a seed script**: the column default reconciles every environment for free
— local, CI, preview, and production — on the deploy that adds it, because `vercel-build` runs
`drizzle-kit push`. A seed script would need running by hand against production, exactly as the
`cookies` system page did.

**Cross-cutting risk this introduces** — a new column with a meaningful default can silently break
other tests/scripts that insert into the same table once something starts reading it. `settings` is
inserted by `upsertSettings` (insert-if-missing) and by test fixtures. Every file touching `settings`
must be checked, not just the ones this feature's tasks name.

### Invariants

- **Non-empty**: at least one genre (FR-010). An empty list would leave post-a-game with no choices.
- **No blanks**: no entry is empty or whitespace-only (FR-011).
- **Unique, case-insensitively**: no two entries equal after lowercasing and trimming (FR-011).
- **Stored as typed**: casing and punctuation preserved exactly (FR-014). "Co-op PvE" and "TTRPG" in
  the current list prove mixed case and punctuation are legitimate. The uniqueness comparison
  lowercases; the stored value never does.

## Unchanged entity: `postings` (deliberately)

| Field | Type | Change |
|---|---|---|
| `genre` | `text` (nullable) | **None.** |

`postings.genre` (`src/db/schema.ts:170`) is plain nullable text — not a Postgres enum, not a foreign
key. Nothing at the database level ties it to the genre list, which is precisely why FR-007 (removing
a genre never touches a posting) costs nothing to honour: there is no constraint to violate and no
cascade to suppress.

**No migration, no backfill, ever.** A posting may hold a genre absent from the list. That is a
permanently supported steady state, not drift to be cleaned up.

## Relationship

There is deliberately **no** referential relationship between `settings.genres` and `postings.genre`.
They are coupled only at the moment a genre *arrives*:

| Path | Rule | Requirement |
|---|---|---|
| New posting | genre must be in the stored list (or absent) | FR-008 |
| Edited posting | genre must be in the stored list **or** unchanged from what the posting already stores | FR-008 + US2 scenario 5 |
| Displaying a posting | no check — show what is stored | FR-007 |
| Browse filter | intersect the requested genres with the stored list; drop unknowns | FR-009 |

The middle two rows are the ones a reader will be tempted to "simplify" into the first. Doing so
strands every host whose genre was retired: they could never edit their own posting's title again
without being forced to relabel it.

## State transitions

`settings.genres` has no lifecycle — it is a value, replaced wholesale on each save (the whole array
is submitted and validated together, as `bannedPhrases` already is). Last write wins; two admins
saving concurrently cannot produce a partial list.
