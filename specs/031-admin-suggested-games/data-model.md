# Phase 1 Data Model: Admin-editable Suggested Games

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-16

## Changed entity: `settings` (existing singleton)

One additive column, alongside 030's `genres` on the same row.

| Field | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `suggestedGames` | `text[]` | NOT NULL | the fourteen games in use today | Ordered. Order is presentation order. |

**Default value** (exactly today's list, so behaviour is unchanged until an admin edits):

```text
{Valorant,"Helldivers 2","Baldur's Gate 3",CS2,"Deep Rock Galactic","Lethal Company",
 "Sea of Thieves","League of Legends","Overwatch 2",Minecraft,"Elden Ring","D&D 5e",
 Catan,"Magic: The Gathering"}
```

Note the punctuation and apostrophes already present ("Baldur's Gate 3", "D&D 5e", "Magic: The
Gathering") — these are legitimate values that must round-trip exactly (FR-013), and they are worth
testing precisely because they are the ones an over-eager sanitiser would mangle.

**Why a default rather than a seed script**: the column default reconciles every environment — local,
CI, preview, production — on the deploy that adds it, because `vercel-build` runs `drizzle-kit push`.
A seed script would need running by hand against production.

**Cross-cutting risk**: a new column with a meaningful default can silently break other tests or
scripts that insert into `settings` once something reads it. Every file touching `settings` must be
checked, not only the ones this feature's tasks name.

### Invariants

- **Non-empty**: at least one game (FR-009). Load-bearing here in a way it wouldn't be for an ordinary
  list: the games step of account creation has no free-text input, so an empty list leaves a newcomer
  with nothing to click (research.md #4).
- **No blanks**: no entry empty or whitespace-only (FR-010).
- **Unique, case-insensitively** (FR-010). Comparison lowercases and trims; the stored value never
  does.
- **Stored as typed**: casing and punctuation preserved exactly (FR-013).

## Unchanged entities (deliberately)

| Entity | Field | Change |
|---|---|---|
| `users` | `gamesPlayed` (`text[]`) | **None.** |
| `userGames` | — | **None.** |

`users.gamesPlayed` (`src/db/schema.ts:36`) holds what a new user picked at account creation.
`gamesPlayedSchema` (`src/lib/validations/onboarding.ts:61`) validates it as an array of non-blank
strings and **does not** check membership of the suggestion list. That stays exactly as it is.

**This is the feature's central invariant, not an omission**: the suggestion list has no referential
relationship to any player's games. It is a source of *defaults offered at one moment*, not a
vocabulary anyone is held to. Adding a membership check would present as tightened validation and
would in fact create the curated Game catalog ADR 0001 rejects, breaking FR-007.

**No migration, no backfill.** Players hold games absent from the list today (anything added from the
profile flow), and will continue to. That is the normal state, not drift.

## Known inconsistency, deliberately untouched

`users.gamesPlayed` (written at account creation) and `userGames` (maintained afterwards by the
profile flow, `src/db/schema.ts:274-283`) are two stores for what reads like the same concept.

Recorded in the data model because a reader will notice it while working here and reasonably wonder
whether this feature should reconcile them. It should not (research.md #8, plan Constitution Check
IV). It predates this feature and is invisible from the admin's side.

## Relationship

```text
settings.suggestedGames ──(offered as chips at one step)──> a new user's chosen games
                                    │
                                    └── no constraint, no foreign key, no validation,
                                        no rewrite — in either direction, ever
```

## State transitions

`settings.suggestedGames` has no lifecycle — it is a value, replaced wholesale on each save, like
`bannedPhrases`. Last write wins; concurrent saves cannot produce a partial list.
