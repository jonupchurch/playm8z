# Quickstart / Validation: Prevent duplicate active applications

## US1 — no duplicate active application, even under a race

- `npx vitest run src/lib/actions/apply-to-posting.test.ts src/lib/actions/invite-to-party.test.ts`
  - Two concurrent `applyToPosting` for the same player/party (`Promise.all`) → exactly ONE active
    application row afterward; neither call throws (one succeeds, the other returns the friendly rejection).
  - A concurrent `applyToPosting` + `inviteToParty` for the same pair → exactly one active row.
  - A sequential duplicate → the existing friendly rejection (from the app-side check).

## US2 — re-apply after a terminal state still works

- Apply → set status `declined` (or `withdrawn`) → apply again → succeeds (new active row).
- With an active (pending/accepted) row present → apply again → refused.

## US3 — dedup winner rule + defense-in-depth

- `npx vitest run src/lib/applications/dedupe-active-applications.test.ts`
  - `planDedupe`: a group `[pending(old), accepted(new)]` keeps the accepted; a same-status group keeps the
    oldest, then smallest id; declined/withdrawn rows are ignored; distinct pairs untouched. Idempotent.
  - DB wrapper: over distinct rows → `{ groups:0, deleted:0 }`, nothing removed (the live index makes real
    duplicate active rows un-insertable, so the collapse itself is covered purely).

## Deploy-safety gate (before any prod DDL)

- `npx drizzle-kit push` twice locally; second run reports no changes — or, if it churns the partial index,
  confirm it's a harmless drop/recreate (schema-declared, per ADR 0018) and proceed. Verify the index via
  `pg_indexes`.

## Full suite (before merge)

- `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all green.

## Production rollout (by hand, before merge)

1. Pull prod `DATABASE_URL` to a temp path outside the repo.
2. Run `lockdown-applications` against prod → report `{ groups, deleted }` (expected `{0,0}` at current scale).
3. Verify the partial index exists (`pg_indexes`).
4. Delete the temp env; merge; confirm the deploy is green and CI passes.
