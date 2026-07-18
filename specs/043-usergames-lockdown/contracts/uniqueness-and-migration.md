# Contracts: uniqueness, conflict-safe add, and migration

Interface-level contracts for the internal seams this feature changes. No HTTP surface changes.

## `dedupeUserGames(userIds?: string[]): Promise<{ groups: number; deleted: number }>`

`src/lib/games/dedupe-user-games.ts`

- Groups `userGames` rows by `(userId, normalizeGame(game))`. For every group with >1 row, keeps exactly one and
  deletes the others by `id`.
- **Winner rule**: prefer a row with `rank != null || hoursPlayed != null` over a bare row; among equally-detailed
  rows keep the oldest `createdAt`, then the smallest `id`. Deterministic.
- `userIds` optional: scopes the run (tests pass specific ids; the script omits it to run over all users).
- Returns `{ groups: <#groups that had duplicates>, deleted: <#rows removed> }`.
- **Idempotent**: a second call over the same data finds no >1 groups → `{ groups: 0, deleted: 0 }`, changes nothing.
- Never touches a user not in scope; never merges fields across rows (picks a winner row as-is).

## `addUserGame(input)` — conflict-safe (contract otherwise unchanged)

`src/lib/actions/manage-games.ts` · returns `ManageGamesResult = { success: true } | { success: false; error }`

- Still `requireAuth()` + `userGameSchema.safeParse(input)` first (unchanged).
- If the caller already has a row whose `normalizeGame(game)` equals the input's, return `{ success: true }` **without
  inserting** (idempotent "already in your list").
- Otherwise insert with `.onConflictDoNothing()` so a concurrent duplicate cannot raise a raw error.
- A duplicate add is **never** an error result; genuine validation failures still return `{ success: false, error }`.
- `removeUserGame` unchanged.

## Migration script `scripts/dedupe-user-games.ts` and the one-shot DDL

- `scripts/dedupe-user-games.ts`: imports and runs `dedupeUserGames()` (no args → all users), prints
  `{ groups, deleted }`. Safe to run repeatedly. Run local, then prod.
- One-shot idempotent DDL (applied by hand local + prod, verified by querying):
  ```sql
  -- 1. (dedupe already run) create the guarantee
  CREATE UNIQUE INDEX IF NOT EXISTS "userGames_userId_normgame_uniq"
    ON "userGames" ("userId", lower(btrim("game")));
  -- 2. drop the retired column
  ALTER TABLE "user" DROP COLUMN IF EXISTS "gamesPlayed";
  ```
  (Table name is `"user"` — the Auth.js adapter's singular table name — per `src/db/schema.ts`.)
- **Verification** (must pass before trusting the step):
  - index present: `SELECT indexname FROM pg_indexes WHERE tablename='userGames' AND indexname='userGames_userId_normgame_uniq';`
  - column gone: `SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='gamesPlayed';` → 0 rows.
- **Ordering** (load-bearing): dedupe → create index → drop column. Local first (+ full test suite incl. e2e), then
  prod by hand before merge, so the deploy's `drizzle-kit push` is a verified no-op.

## Deploy-safety contract for the expression index

- After declaring the index in `src/db/schema.ts`, `drizzle-kit push` run twice locally MUST report **no changes on the
  second run**. If it does not, the index is instead SQL-managed (created by the DDL above, not declared in the drizzle
  schema object) with a schema comment — so `drizzle-kit push` on every deploy never attempts to recreate it.
