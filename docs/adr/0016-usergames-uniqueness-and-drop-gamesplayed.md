# ADR 0016: Enforce `userGames` uniqueness and drop the retired `users.gamesPlayed`

**Status**: Accepted

**Date**: 2026-07-18

**Feature**: `043-usergames-lockdown`

**Supersedes**: ADR 0015 §4 (no DB constraint) and §5 (deprecate-don't-drop) — both were explicitly
framed there as later cleanups; this ADR carries them out now that 042's backfill has run and stabilized
on local and production.

## Context

Feature 042 (ADR 0015) made `userGames` the single source of truth and deferred two follow-ups:

- §4: dedup was left application-side with no DB constraint, "a separate decision that would need its own
  de-duplication of any pre-existing rows."
- §5: `users.gamesPlayed` was deprecated but kept in place, "a destructive DROP … deferred to a later,
  deliberate cleanup."

Both are now ready. The backfill has run everywhere and stayed stable, and a real leak remains: `addUserGame`
(profile "add a game") is a bare insert with no dedup, so a player can accumulate `"Halo"` twice or `"Halo"`
+ `"halo"`. The other three writers (onboarding sync, Steam import, backfill) already dedup, but nothing at
the data layer prevents it.

## Decision

1. **Per-player uniqueness is enforced by a Postgres expression unique index** on
   `(userId, lower(btrim(game)))`, which exactly reproduces `normalizeGame` (trim + lowercase). No games can
   normalize-collide for one player, on any write path, present or future. No `normalizeGame` change and no
   materialized normalized column.

2. **Existing duplicates are collapsed once, keeping the most-detailed row.** `dedupeUserGames()` groups by
   `(userId, normalized game)`, keeps the row with a non-null `rank`/`hoursPlayed` over a bare row (tie-break:
   oldest `createdAt`, then `id`), deletes the rest. Idempotent; run local then prod before the index is created
   (the index cannot be created while duplicates exist).

3. **`addUserGame` is conflict-safe.** It normalizes and checks for an existing match first (returning a benign
   "already in your list" without inserting), and inserts with `ON CONFLICT DO NOTHING` as a race backstop. The
   `ManageGamesResult` contract is unchanged; a duplicate add is never an error. App-side dedup is retained as
   defense-in-depth so normal flows never depend on catching a DB error and a future constraint removal wouldn't
   instantly regress the UX.

4. **`users.gamesPlayed` is dropped** from the database (local + prod) and the schema, and 042's now-defunct
   backfill code that read it (`backfill-user-games.{ts,test.ts}`, `scripts/backfill-user-games.ts`) is deleted.
   Its data was already migrated into `userGames`; nothing reads or writes the column.

5. **The index is declared in the Drizzle schema iff `drizzle-kit push` proves idempotent for it** (a local
   double-push must report no changes on the second run). Because `vercel-build` runs `drizzle-kit push` on every
   deploy, an expression index that push mis-diffs would break redeploys; if that happens, the index is instead
   SQL-managed (created by the one-shot script, not declared in the drizzle schema object) with a schema comment,
   so push never touches it. Production DDL is applied by hand before merge so the deploy push is a verified no-op.

## Consequences

- A player can never hold the same game twice; the one un-deduped write path is closed and the guarantee is at the
  data layer for every path.
- One store, one guarantee, no retired column — 042's loop is fully closed; no future feature can read the stale
  `gamesPlayed` (it no longer exists).
- A brief, accepted micro-window exists between creating the prod index by hand and the conflict-safe code deploying,
  in which the old `addUserGame` could surface one error toast on a duplicate add. No data corruption is possible;
  it self-heals on deploy. Accepted over a two-deploy dance given the scale.
- The expression index is a slightly less common shape; the double-push idempotency gate + SQL-managed fallback keep
  deploys safe.

## Alternatives considered

- **Plain `(userId, game)` unique index** — rejected: case/whitespace-sensitive; wouldn't match `normalizeGame`.
- **Stored normalized column + plain unique** — rejected: out of scope; a column to keep in sync forever.
- **Keep app-side dedup only (no DB constraint)** — rejected: leaves the guarantee unenforceable across future paths
  and the double-submit race open.
- **Keep `users.gamesPlayed`** — rejected: dead column and a standing "wrong store" trap; its consumer code is already
  defunct.
- **Two deploys for a zero-width rollout window** — rejected: overkill for this scale; the window is cosmetic and
  self-healing.
