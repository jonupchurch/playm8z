# Feature Specification: Lock down `userGames` as the true single source of truth

**Feature Branch**: `043-usergames-lockdown`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: "Complete feature 042 by doing its two explicitly-deferred follow-ups together: make duplicate games impossible per player at the database level, and drop the retired `users.gamesPlayed` column now that the backfill has run everywhere and stayed stable."

## Context *(why this feature exists)*

Feature 042 (ADR 0015) made `userGames` the single source of truth for a player's
games, switched onboarding to reconcile into it, and backfilled existing players —
but deliberately deferred two cleanups "to a later cleanup once the backfill has run
everywhere and stayed stable" (docs/future-work.md, the ADR-0015 follow-up section):

1. **Duplicate games are still possible.** `userGames` has no uniqueness guarantee.
   Dedup is done entirely in application code (`normalizeGame` = trim + lowercase).
   Three of the four writers dedup correctly (onboarding sync, Steam import, backfill),
   but `addUserGame` — the profile "add a game" action — is a bare insert with no dedup,
   so a player can add "Halo" twice, or "Halo" then "halo", and end up with two rows.

2. **The retired `users.gamesPlayed` column is still present.** After 042 nothing reads
   or writes it; its data was preserved into `userGames` by the one-time backfill. It was
   kept in place only so that dropping it could be a separate, deliberate step.

The backfill has now run against local and production and is stable, so both follow-ups
are ready. They belong together: each is part of making `userGames` not just the
*preferred* store but the *guaranteed, sole, well-formed* one.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A player can never end up with the same game twice (Priority: P1)

A player manages their games from their profile. No matter how they add a game —
tapping "add" twice quickly, adding a game they already have, or adding a differently-cased
or space-padded spelling of one they already have — they end up with that game listed
exactly once. Adding a game they already play is a harmless no-op that reports success,
not an error.

**Why this priority**: This is the integrity guarantee. It closes the one un-deduped write
path and makes duplicates impossible at the data layer for *every* path, current or future.
Independently valuable and testable on its own.

**Independent Test**: Add "Valorant", then add "valorant" (and "  Valorant  ") again — the
profile shows exactly one "Valorant" and each repeat add returns a benign success. Inspect
the store directly: exactly one row for that player/game.

**Acceptance Scenarios**:

1. **Given** a player who already has "Valorant", **When** they add "Valorant" again,
   **Then** they still have exactly one "Valorant" and the action reports success (not an error).
2. **Given** a player who has "Valorant", **When** they add "valorant" or "  Valorant  ",
   **Then** no second row is created (same normalized identity), and the action reports success.
3. **Given** a player with no games, **When** two add-requests for the same game arrive nearly
   simultaneously (double-submit), **Then** at most one row exists afterward and neither request
   surfaces a raw server error.
4. **Given** any write path that adds games (profile add, onboarding, Steam import, backfill),
   **When** it runs, **Then** it cannot create a duplicate for a player — the guarantee holds
   regardless of which path wrote the game.

---

### User Story 2 - The retired onboarding column is gone (Priority: P2)

The legacy `users.gamesPlayed` column no longer exists in the database. Its data was already
migrated into `userGames` by 042's backfill, so nothing is lost. No product surface reads or
writes it (042 already removed the last readers/writers). The onboarding client contract is
unchanged — players still pick games the same way; only the now-empty storage column is removed.

**Why this priority**: Removing the dead column closes 042's loop and eliminates the standing
risk that a future feature reads the stale, onboarding-only column instead of the source of
truth. It depends on the backfill having run everywhere (it has), so it lands after US1's
guarantee rather than blocking it.

**Independent Test**: Complete onboarding picking games → they appear on the profile and in
matching (unchanged from 042). Inspect the database schema → the `gamesPlayed` column is absent
from the users table. Audit the codebase → no code references it.

**Acceptance Scenarios**:

1. **Given** the database after this feature, **When** the users table is inspected, **Then**
   the `gamesPlayed` column does not exist (local and production).
2. **Given** onboarding, **When** a player picks games and finishes, **Then** those games appear
   on their profile and in matching exactly as they did after 042 — no regression from the drop.
3. **Given** the codebase, **When** it is audited for references to the retired column, **Then**
   none remain (schema definition included).

---

### User Story 3 - The uniqueness guarantee is defense-in-depth, not the only guard (Priority: P3)

The application still refuses to write a duplicate on its own, independently of the database
constraint — so the player-facing "already in your list" behavior is driven by app logic, and
the database constraint is a backstop that catches any path that ever forgets. Removing the DB
constraint later would not instantly regress the clean UX.

**Why this priority**: Keeping app-side dedup alongside the DB constraint means normal flows
never rely on catching database errors, and a future constraint change can't silently reintroduce
visible duplicates. It's a robustness property layered on US1, so it lands last.

**Independent Test**: With the DB constraint hypothetically absent, adding a game a player already
has still results in one row and a benign result (app-side dedup alone handles the common case);
with app-side dedup hypothetically absent, the DB constraint still prevents a second row (the add
resolves without a raw error). Both layers are exercised by tests.

**Acceptance Scenarios**:

1. **Given** the profile add action, **When** a player adds a game they already have, **Then** the
   app detects it and returns "already in your list" without attempting a duplicating write.
2. **Given** a write that does reach the database with a would-be duplicate, **When** it executes,
   **Then** the database rejects the duplicate and the action translates that into a benign result,
   never a raw server error.

---

### Edge Cases

- **Pre-existing duplicates block the constraint**: if any player already has duplicate rows (very
  possible via the un-deduped add path), creating the uniqueness constraint fails. Existing
  duplicates MUST be collapsed once, before the constraint is created.
- **Which duplicate wins**: when collapsing duplicates for a player/game, the row carrying the most
  self-reported detail (a non-null rank and/or hours) is kept over a bare name-only duplicate, so a
  player's "Diamond, 200h" is never discarded in favor of an empty copy. Ties break toward the
  oldest row.
- **Normalized identity**: two games are "the same" when their names match after trimming and
  lowercasing (the existing `normalizeGame` rule) — the uniqueness must use that exact notion, not
  raw string equality, or "Halo"/"halo" would both survive.
- **Idempotent cleanup**: the one-time dedup runs safely more than once (local, then production, and
  re-runs) and changes nothing on a second pass.
- **Migration ordering**: collapse duplicates → add the uniqueness constraint → drop the column; the
  destructive/constraint steps are applied to production by hand before the change merges, so the
  automatic schema push on deploy finds nothing left to do.
- **Empty onboarding pick**: a player who selects no games still finishes onboarding with an empty
  list — unchanged; the column drop doesn't affect this.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A player MUST NOT be able to have the same game listed twice, where "same" means equal
  after trimming and lowercasing (the existing normalized-name rule). This MUST hold regardless of
  which write path added the game.
- **FR-002**: The system MUST enforce this uniqueness at the data layer (a per-player uniqueness
  guarantee over the normalized game name), so that no application path — present or future — can
  persist a duplicate.
- **FR-003**: The profile "add a game" action MUST become conflict-safe: it MUST detect that the
  player already has the (normalized) game and return a benign "already in your list" result instead
  of creating a duplicate, AND it MUST NOT surface a raw server error if a duplicate nonetheless
  reaches the data layer. Its existing result contract (success / error) is unchanged.
- **FR-004**: Before the uniqueness guarantee is established, the system MUST collapse any existing
  duplicate rows once, keeping exactly one row per player/normalized-game. The kept row MUST be the
  one with the most self-reported detail (non-null rank and/or hours preferred over a bare row),
  breaking ties toward the oldest. This cleanup MUST be idempotent and safe to run against every
  environment.
- **FR-005**: The retired `users.gamesPlayed` column MUST be removed from the database (local and
  production) and from the schema definition. No product surface may reference it afterward.
- **FR-006**: Removing the column MUST NOT change any player-facing behavior established by 042 —
  onboarding game picks MUST still appear on the profile and in matching. The onboarding client
  contract (how games are submitted) MUST be unchanged.
- **FR-007**: The application MUST retain its own dedup on writes as defense-in-depth, so the common
  "already have it" case is handled without relying on catching a database error, and so a later
  removal of the database constraint would not immediately reintroduce visible duplicates.
- **FR-008**: The uniqueness rule MUST use the same normalization as the rest of the product
  (`normalizeGame`) and MUST NOT change that normalization or introduce a separate stored normalized
  field.

### Key Entities *(include if feature involves data)*

- **Player game (`userGames`)**: the maintained list of games a player plays — a name plus optional
  self-reported rank and hours. This feature adds a per-player uniqueness guarantee over the
  normalized name and collapses any pre-existing duplicates, while leaving the shape otherwise
  unchanged. Remains the single source of truth (042).
- **Retired onboarding snapshot (`users.gamesPlayed`)**: the legacy name-only array captured once at
  onboarding, unread and unwritten since 042, its data already migrated into `userGames`. This
  feature removes it entirely.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this feature, no player can hold two rows for the same normalized game — verified
  by attempting duplicate/case-variant/rapid adds and finding exactly one row each time (today:
  possible via the profile add path).
- **SC-002**: A player adding a game they already have sees a benign "already in your list" outcome in
  100% of cases, never a server error.
- **SC-003**: The one-time duplicate cleanup collapses every pre-existing duplicate group to one row,
  preserves the most-detailed row in 100% of groups, and changes 0 rows on a second run (idempotent).
- **SC-004**: The `users.gamesPlayed` column is absent from the database and codebase after this
  feature (0 references, 0 columns), with no regression to onboarding→profile→matching.
- **SC-005**: The full existing test suite (unit/integration and end-to-end) passes, including the
  onboarding end-to-end flow, with no new duplicate-game or missing-game regressions.

## Assumptions

- **The backfill is complete and stable.** 042's seed-empty-only backfill has run on local and
  production, so `userGames` already holds the games that `gamesPlayed` used to carry; dropping the
  column loses nothing.
- **Normalized identity is trim + lowercase**, matching the existing `normalizeGame` used across the
  product (image lookup aside, which is deliberately case-sensitive and out of scope here).
- **Duplicates may already exist** in `userGames` because the profile add path never deduped — the
  cleanup must assume and handle them, not presume a clean table.
- **The onboarding client contract stays the same** — the wizard still submits chosen game names; only
  the server-side storage column being dropped changes, and 042 already routed those names to
  `userGames`.
- **Production DDL is applied by hand before merge**, consistent with features 041 and 042, so the
  automatic schema push on deploy is a no-op; each step is verified by querying rather than trusting a
  silent migration.

## Out of Scope

- Changing `normalizeGame`'s semantics or adding a stored normalized-name column — the uniqueness uses
  the existing function; a materialized normalized field is a different, unneeded design.
- Any change to the games-picker UX, the profile games editor UI, or the suggested-games source — only
  the profile add action's dedup *behavior* changes (returning "already added" instead of duplicating).
- Merging fields across duplicate rows beyond "keep the most-detailed row" — a winner row is chosen; no
  field-level merge of rank/hours from two rows into one.
- Deduplicating or constraining any other table — this is specifically `userGames` plus the
  `users.gamesPlayed` column drop.
- Dropping any other deprecated column.
