# 0001. Treat "game" as a free-text keyword, not a curated catalog

**Status**: Accepted (2026-07-12)

> **Amended by [ADR 0011](0011-game-image-alias-layer.md) (2026-07-17).**
> Feature 035 adds an *optional* game-image + alias lookup layer beside this
> decision — the "lightweight alias table to layer on top" the Consequences
> below explicitly permit. `game` stays free text, postings still reference
> no catalog, and there's still no per-game hub page: 0011 attaches images to
> names, it does not make `game` a foreign key. If you're reading "no
> catalog" and about to treat 035's `games` table as a contradiction to fix,
> read 0011 first — it isn't one.

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
- No dedicated per-game hub page (e.g. `/games/:slug`) for now — "browse
  games" is satisfied by Browse's keyword search/filter over postings. A
  hub page is a possible future feature (see `docs/future-work.md`), not a
  current focus; if built later, it would aggregate on the free-text
  keyword rather than a canonical catalog.
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
