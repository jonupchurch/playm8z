# ADR 0015: `userGames` is the single source of truth for a player's games

**Status**: Accepted

**Date**: 2026-07-17

**Feature**: `042-unify-player-games`

## Context

A player's games were stored in two disconnected places:

- `users.gamesPlayed` (a `text[]`), written once by onboarding
  (`/api/onboarding`) and never updated afterward.
- `userGames` (a table), maintained by the profile editor (`manage-games.ts`) and
  the Steam import, and read by the profile page, "you have in common" matching
  (`get-in-common.ts`), and the public profile.

The two were never reconciled. A newly-onboarded player's game picks went into
`users.gamesPlayed` and were read by nothing downstream, so they never appeared on
the profile and never influenced matching — despite onboarding promising "Pick a
few — we'll surface matching parties first." This was an active bug, not just
tech debt, and the future-work note that flagged it asked the open question:
"which store wins, and what happens to a player whose two lists disagree?"

## Decision

1. **`userGames` is the single source of truth** for a player's games. Every
   surface that shows or matches on games reads it (already true); onboarding now
   also writes it.

2. **Onboarding reconciles `userGames`, not `users.gamesPlayed`.** When the
   onboarding step submits game names, the server set-syncs the user's `userGames`
   to that selection (insert selected, delete de-selected), deduped by
   `normalizeGame`. It no longer writes `users.gamesPlayed`. This is safe because
   onboarding is a linear first-time flow — a completed player manages games from
   their profile, not by re-entering onboarding — so the set-sync can never clobber
   a separately-curated list.

3. **Disagreements resolve as "userGames wins; seed only when empty."** A one-time
   idempotent backfill seeds `userGames` from `users.gamesPlayed` ONLY for players
   who have zero `userGames` rows. Players with any curated games are skipped
   entirely. This recovers players who lost their onboarding picks without ever
   resurrecting a game someone removed or overwriting a curated list — the answer
   to the future-work question.

4. **Deduplicate in application code; add no DB constraint.** `userGames` has no
   uniqueness constraint and dedup is already done application-side by
   `normalizeGame` (the Steam import's pattern). This feature follows suit. Adding
   a unique/normalized constraint is a separate decision that would need its own
   de-duplication of any pre-existing rows.

5. **Deprecate `users.gamesPlayed`, don't drop it.** After this feature it has no
   readers or writers; the column stays in place (documented as retired). A
   destructive `DROP` is deferred to a later, deliberate cleanup.

## Consequences

- Onboarding's promise finally holds: a new player's games appear on their profile
  and drive matching from the first session.
- Existing affected players are recovered safely; curated players are untouched.
- One store to reason about going forward; no future feature should read
  `users.gamesPlayed`.
- No migration and no constraint, so the change tolerates any pre-existing
  duplicate `userGames` rows. The retired column is dead weight until a later drop.

## Alternatives considered

- **Keep both stores in sync on every write** — rejected: doubles the write
  surface and the drift risk; the whole problem is having two stores.
- **`gamesPlayed` wins / always overwrite from it** — rejected: would clobber
  curated profiles and resurrect removed games.
- **Add a unique constraint to `userGames` now** — rejected: needs its own de-dup
  migration and could fail on existing rows; app-side dedup already works.
- **Drop `users.gamesPlayed` in this feature** — rejected: destructive and
  separable; deprecate now, drop later.
