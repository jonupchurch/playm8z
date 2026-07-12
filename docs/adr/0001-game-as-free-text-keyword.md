# 0001. Treat "game" as a free-text keyword, not a curated catalog

**Status**: Accepted (2026-07-12)

## Context

`resources/guidelines.md` §5 suggested a first-class `Game` entity
(`id, name, genre`) that `Posting` would reference by `gameId`, with Browse's
"Game" filter and Home's "Trending now" strip built off it. That implies
someone maintains a canonical list of games — either an admin curates it, or
an "Other" free-entry option exists alongside it.

Both are unappealing: a curated catalog needs ongoing maintenance as new
games release, and an "Other" escape hatch reintroduces the exact
fragmentation problem (typos, casing, "Valorant" vs "valorant" vs "VALORANT")
a catalog was meant to prevent — while adding the maintenance burden anyway.

## Decision

`game` is a plain text/keyword field on `Posting` (and wherever else it's
entered/displayed), not a foreign key to a `Game` table. There is no admin
"Games" catalog page. Browse's game filter and Home's trending games are
built by aggregating/grouping on that free-text field (case-insensitive,
trimmed), not by joining to a canonical list.

This also means:
- No dedicated per-game hub page (e.g. `/games/:slug`) is planned — "browse
  games" is satisfied by Browse's keyword search/filter over postings, not
  a separate page per game.
- Minor fragmentation (near-duplicate spellings splitting counts/filters) is
  an accepted tradeoff, not a bug to solve with a catalog.

## Consequences

- `src/db/schema.ts` should model `game` as a string column on the posting
  table, not a relation to a separate games table, when that table is built.
- `resources/guidelines.md` §5's `Game` entity and `gameId` foreign key are
  superseded by this ADR — guidelines.md is otherwise still authoritative,
  but not on this point.
- If fragmentation becomes a real problem later, normalization (e.g.
  fuzzy-matching or a lightweight alias table) is a smaller, reversible fix
  to layer on top — not a reason to revisit this decision now.
