# Research: Lock down `userGames`

Phase 0 decisions. Each resolves a real tradeoff surfaced by the spec + the codebase.

## 1. Uniqueness mechanism: expression unique index on `(userId, lower(btrim(game)))`

**Decision**: Enforce per-player game uniqueness with a Postgres **expression unique index**:
`CREATE UNIQUE INDEX "userGames_userId_normgame_uniq" ON "userGames" ("userId", lower(btrim("game")))`.
`lower(btrim(...))` exactly reproduces `normalizeGame(name) = name.trim().toLowerCase()`.

**Rationale**: The spec forbids changing `normalizeGame` and forbids a materialized normalized column.
A plain unique index on `(userId, game)` would be case/whitespace-sensitive and let "Halo"/"halo"/" Halo "
all coexist — failing FR-001/FR-008. An expression index matches the app's own notion of sameness with no
schema shape change and no data migration beyond collapsing existing dups.

**Alternatives considered**:
- *Plain `(userId, game)` unique* — rejected: doesn't match `normalizeGame`; misses case/whitespace variants.
- *Stored normalized column + plain unique* — rejected: explicitly out of scope; adds a column to keep in sync.
- *App-only uniqueness (no DB constraint)* — rejected: the whole point is a guarantee no write path can violate.

## 2. drizzle-kit push idempotency for the expression index — gated, with a fallback

**Decision**: Declare the index in `src/db/schema.ts` via Drizzle's `uniqueIndex(...).on(table.userId, sql\`lower(btrim(${table.game}))\`)`
so the schema is the source of truth — **conditional on** a local validation gate: after adding it, run
`drizzle-kit push` twice against the local DB and confirm the **second run reports no changes**. If push
mis-diffs the expression index (a known drizzle-kit weak spot) and churns/errors on the second run, fall back to
managing the index purely via explicit SQL (created by the one-shot script; **not** declared in the drizzle
schema object) with a prominent comment on the `userGames` table pointing to it — so `drizzle-kit push` on every
deploy never touches it.

**Rationale**: `vercel-build` runs `drizzle-kit push --verbose` on *every* deploy. If push tries to recreate the
index (no `IF NOT EXISTS` in its generated DDL), a redeploy would fail. The double-push local test is a cheap,
definitive check. Declaring-in-schema is preferred (discoverability, source-of-truth) but must not risk breaking
deploys; the SQL-managed fallback removes the index from push's view entirely and is provably deploy-safe.

**Alternatives considered**:
- *Trust push blindly* — rejected: expression-index diffing is precisely where drizzle-kit has historically churned;
  a broken prod deploy is a much worse outcome than a schema comment.
- *Generate a SQL migration file and run `db:migrate`* — rejected: repo uses `drizzle-kit push` on deploy, and
  `db:migrate` "can silently no-op" (project memory); by-hand idempotent DDL + verification is the established pattern.

## 3. Collapsing pre-existing duplicates: `dedupeUserGames()` — keep the most-detailed row

**Decision**: A pure/idempotent `dedupeUserGames(userIds?)` (mirroring 042's `backfillUserGames` shape): group a
user's rows by `normalizeGame(game)`; for any group of >1, keep exactly one row and delete the rest by id. Winner =
the row with the most self-reported detail (**`rank` non-null OR `hoursPlayed` non-null** beats a bare row), tie-broken
by **oldest `createdAt`, then smallest `id`**. Returns `{ groups, deleted }`. A thin `scripts/dedupe-user-games.ts`
wrapper runs it and prints a report; run local then prod, idempotent (second run finds no groups).

**Rationale**: The un-deduped `addUserGame` path could have produced dups where one copy carries a player's
rank/hours and another is bare — silently dropping the detailed one would lose real user data. "Most-detailed, then
oldest" preserves the richest row deterministically. Doing it in app code (not a clever single SQL `DELETE USING`)
keeps the winner rule readable and unit-testable, exactly like 042's dedupe.

**Alternatives considered**:
- *Pure-SQL `DELETE ... USING` self-join* — rejected: the multi-key winner rule (detail, then createdAt, then id)
  is fiddly and error-prone in one SQL statement and hard to unit-test; the app-code version is clearer.
- *Keep newest / keep arbitrary* — rejected: could discard the row a player actually curated (rank/hours).

## 4. `addUserGame` conflict-safety: app-side dedup primary, `onConflictDoNothing()` backstop

**Decision**: Make `addUserGame` (a) normalize the input and check whether the player already has that normalized
game; if so, return a benign result (`{ success: true }`, treated as "already in your list") **without inserting**;
and (b) issue the insert with `.onConflictDoNothing()` (no explicit target — a bare `ON CONFLICT DO NOTHING` catches
the unique violation regardless of index shape) as a race backstop. The `ManageGamesResult` contract is unchanged.

**Rationale**: App-side dedup keeps the normal "already have it" path from ever depending on catching a DB error
(FR-007) and gives clean UX. `onConflictDoNothing()` closes the double-submit TOCTOU window without raising a raw
500 (FR-003). `userGames` has no other unique constraint (PK id is generated), so a target-less `DO NOTHING` can only
swallow *this* conflict — safe.

**Alternatives considered**:
- *Only catch the 23505 error* — rejected: makes the normal case error-driven; worse UX and log noise.
- *Only app-side dedup, no DB backstop* — rejected: leaves the concurrent double-submit race (spec AS #3) open.
- *`onConflictDoNothing({ target: ... })` with the expression* — rejected: awkward/brittle to name an expression
  target; the bare form is simpler and equivalent here.

## 5. Dropping `users.gamesPlayed` also retires 042's backfill code

**Decision**: Remove `users.gamesPlayed` from the schema and DB, AND delete `src/lib/games/backfill-user-games.ts`,
`scripts/backfill-user-games.ts`, and `src/lib/games/backfill-user-games.test.ts`. Grep-verify no other reader/writer
of the column remains before dropping.

**Rationale**: `backfillUserGames()` *reads* `users.gamesPlayed`; once the column is gone the code can't compile and
can never run again anyway (its one-time migration completed on local + prod). It's the classic "a dropped column
breaks the code that fed on it" — the drop is incomplete without retiring that consumer. The onboarding route's
`patch.gamesPlayed` is the *client field name* (mapped into `userGames` by 042), not the DB column, and stays.

**Alternatives considered**:
- *Keep the backfill code* — rejected: won't typecheck against the dropped column; dead weight referencing a
  non-existent column.

## 6. Rollout ordering and the accepted micro-window

**Decision**: Order = **collapse dups → create unique index → drop column** (drop can happen any time; do it last for
tidiness). Apply to **local first** (+ full test suite incl. e2e), then to **prod by hand before merge** (pull prod
`DATABASE_URL` to a temp path outside the repo, run dedupe + DDL idempotently, verify via `information_schema`/`pg_indexes`,
delete temp). Then merge; the deploy's `drizzle-kit push` finds the DB already matching → no-op.

**Accepted micro-window**: between creating the prod index by hand and the 043 deploy going live, the still-running
042-era `addUserGame` (plain insert) could hit the new constraint if a player adds a *duplicate* game in that ~2-3 min
build window — surfacing one error toast for one action, self-healing once the conflict-safe code deploys. Given the
tiny user base and the low probability of a duplicate-add in that exact window, this is accepted and documented rather
than eliminated with a two-deploy dance. No data corruption is possible (the constraint only *rejects* a dup).

**Rationale**: Matches the 041/042 by-hand-DDL-before-merge pattern that makes the auto-push a verified no-op. The
ordering (dedupe before index) is mandatory — creating the index on a table with dup rows fails.

**Alternatives considered**:
- *Two deploys (ship conflict-safe code first, add index second) for a zero-width window* — rejected as overkill for
  this scale; the micro-window is cosmetic and self-healing.
- *Let the deploy push create the index* — viable only after dedupe; still has the same build-window; by-hand keeps
  verification explicit.

## 7. CHANGELOG / Patch Notes

**Decision**: Update `CHANGELOG.md` + `status.md` (Principle VI). The change has one genuinely player-perceptible
effect — you can no longer end up with the same game listed twice — so it warrants a short **user-facing** CHANGELOG
line and, per the standing workflow, a live **Patch Notes** prod news post in player-facing wording. The column drop and
constraint mechanics are internal and stay out of the player-facing copy.
