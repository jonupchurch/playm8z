# Quickstart / Validation: Lock down `userGames`

Runnable validation that the feature holds. Assumes local Postgres + `.env.local`.

## Prerequisites

- `npm ci` done; local Postgres running with the app schema.
- No stale dev server on port 3000 before running e2e (project trap — kill it first).

## US1 — Duplicate games are impossible per player

1. **Unit**: `npx vitest run src/lib/actions/manage-games.test.ts`
   - Adding a game, then adding the same name / a case-variant / a space-padded variant → the store holds exactly one
     row and each repeat returns `{ success: true }` (benign), not an error.
2. **Constraint (integration)**: with the unique index present, a direct duplicate insert bypassing the app check is
   rejected by the DB; `addUserGame`'s `onConflictDoNothing()` means the action still resolves without a raw error.
3. **Manual**: on a profile, add a game you already have → UI shows it once, with an "already in your list"-style outcome.

## US1 — Dedupe of pre-existing rows

- `npx vitest run src/lib/games/dedupe-user-games.test.ts`
  - A player with `["Halo"(bare), "halo"(rank=Diamond, hours=200), " Halo "(bare)]` collapses to the single
    rank/hours row; `{ groups: 1, deleted: 2 }`. A second run → `{ groups: 0, deleted: 0 }` (idempotent).
  - Another user's rows are untouched.

## US2 — Retired column is gone

1. **Schema/DB (local)** after the DDL:
   - `SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='gamesPlayed';` → 0 rows.
   - `SELECT indexname FROM pg_indexes WHERE tablename='userGames' AND indexname='userGames_userId_normgame_uniq';` → 1 row.
2. **Codebase**: `rg "gamesPlayed" src` shows only the onboarding *client field* name (validation schema / wizard /
   route input mapping), never a `users.gamesPlayed` DB reference; `backfill-user-games.*` are gone.
3. **No regression**: full e2e — `npx playwright test` (esp. `e2e/signup-onboarding.spec.ts`): onboarding game picks
   still land in `userGames` and appear on the profile.

## Deploy-safety gate (before any prod DDL)

- `npx drizzle-kit push` twice against local; the **second run reports no changes**. If it churns on the expression
  index, switch to the SQL-managed index (research.md #2) and re-verify the double-push is clean.

## Full suite (must be green before merge)

- `npm run typecheck && npm run lint && npm run test && npm run test:e2e`

## Production rollout (by hand, before merge)

1. Pull prod `DATABASE_URL` to a temp path **outside** the repo; extract without printing.
2. `dedupe-user-games` against prod → report `{ groups, deleted }`.
3. Apply the two idempotent DDL statements against prod; verify column gone + index present (queries above).
4. Delete the temp env file.
5. Merge → confirm the deploy succeeds and `drizzle-kit push` was a no-op (deploy logs / green deploy).
