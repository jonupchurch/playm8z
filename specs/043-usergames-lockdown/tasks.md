# Tasks: Lock down `userGames` as the true single source of truth

**Input**: Design documents from `specs/043-usergames-lockdown/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/uniqueness-and-migration.md

**Tests**: Included (constitution Principle V — every non-trivial unit of logic gets unit tests; seams that can
silently break get integration coverage; the full suite incl. e2e must be green before merge).

**Branch**: `043-usergames-lockdown` (off the freshly-greened `main`). Merge only after `main`'s greening CI is
confirmed and the full local suite (incl. e2e) is green — this feature is exactly the class of change (schema +
onboarding-adjacent) that the 042 e2e miss came from.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Reference inventory: `rg "gamesPlayed" src` and `rg "insert\(userGames\)|delete\(userGames\)" src` to
  reconfirm (a) the only remaining `gamesPlayed` uses are the onboarding *client field* (validation schema / wizard /
  route input), not `users.gamesPlayed` DB access, and (b) the userGames write sites match the plan (addUserGame,
  syncOnboardingGames, importSteamLibrary, backfill). Record anything unexpected before editing.

---

## Phase 2: User Story 1 — Duplicate games are impossible per player (Priority: P1) 🎯 MVP

**Goal**: No player can hold two rows for the same normalized game, on any write path; a duplicate add is a benign
"already in your list", never an error.

**Independent Test**: Add a game, then add its exact/case/space variant → exactly one row + benign success; a direct
duplicate insert is rejected by the DB; `dedupeUserGames` collapses seeded duplicates and is idempotent.

### Tests for User Story 1

- [ ] T002 [P] [US1] `src/lib/games/dedupe-user-games.test.ts`: a group `["Halo"(bare), "halo"(rank+hours), " Halo "(bare)]`
  collapses to the rank/hours row → `{ groups:1, deleted:2 }`; second run → `{ groups:0, deleted:0 }`; another user's rows
  untouched; scoped by `userIds`. (Follow 042's dedupe/backfill test shape; explicit `createdAt` per row where ordering
  matters — project timestamp-skew trap.)
- [ ] T003 [P] [US1] `src/lib/actions/manage-games.test.ts` (amend): adding a game already present (exact, `UPPER`, and
  `"  Padded  "`) returns `{ success:true }` and leaves exactly one row; two concurrent `addUserGame` for the same game
  (Promise.all) leave ≤1 row and neither rejects. Mock `@/auth` per the action-test pattern; seed a real user.

### Implementation for User Story 1

- [ ] T004 [US1] `src/lib/games/dedupe-user-games.ts`: `dedupeUserGames(userIds?)` — group by `normalizeGame(game)`,
  keep the most-detailed row (rank/hours non-null > bare; tie: oldest `createdAt`, then `id`), delete the rest by id;
  returns `{ groups, deleted }`; idempotent; scoped by optional `userIds`.
- [ ] T005 [US1] `scripts/dedupe-user-games.ts`: thin wrapper that runs `dedupeUserGames()` (all users) and prints the
  report. Add `export {}` if it collides with a sibling seed script's top-level `main()` (project trap).
- [ ] T006 [US1] Add the expression unique index to `userGames` in `src/db/schema.ts`:
  `uniqueIndex("userGames_userId_normgame_uniq").on(table.userId, sql\`lower(btrim(${table.game}))\`)` (add `uniqueIndex`
  to the drizzle imports if absent).
- [ ] T007 [US1] Deploy-safety gate (local): run `dedupeUserGames()` against local; create the index locally
  (`drizzle-kit push`); then run `drizzle-kit push` **again** and confirm **no changes** on the second run. If it churns
  on the expression index, remove it from the schema object, create it via the one-shot SQL instead, and add a prominent
  `// unique index managed in SQL, see scripts/…` comment on the `userGames` table; re-verify the double-push is clean.
  Verify: `SELECT indexname FROM pg_indexes WHERE tablename='userGames' AND indexname='userGames_userId_normgame_uniq';`
- [ ] T008 [US1] Make `addUserGame` conflict-safe in `src/lib/actions/manage-games.ts`: after Zod validation, load the
  caller's existing games, and if `normalizeGame(input.game)` matches one, return `{ success:true }` without inserting;
  otherwise `db.insert(userGames).values(...).onConflictDoNothing()`. Keep the `ManageGamesResult` contract; a duplicate
  is never `{ success:false }`. Add a short comment noting the two layers (app-side dedup + DB backstop).

**Checkpoint**: T002–T003 pass; a duplicate/case/space add yields one row + benign success locally.

---

## Phase 3: User Story 2 — The retired onboarding column is gone (Priority: P2)

**Goal**: `users.gamesPlayed` no longer exists in the DB or schema, its defunct consumer code is removed, and nothing
player-facing regresses.

**Independent Test**: Onboarding picks still land in `userGames` and show on the profile; the users table has no
`gamesPlayed` column; no code references it.

### Implementation for User Story 2

- [ ] T009 [US2] Remove `gamesPlayed: text("gamesPlayed").array()` (and its deprecation comment) from the `user` table
  in `src/db/schema.ts`.
- [ ] T010 [US2] Delete the defunct 042 backfill consumers of the column: `src/lib/games/backfill-user-games.ts`,
  `src/lib/games/backfill-user-games.test.ts`, `scripts/backfill-user-games.ts`.
- [ ] T011 [US2] Drop the column locally: `ALTER TABLE "user" DROP COLUMN IF EXISTS "gamesPlayed";` and verify absent via
  `SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='gamesPlayed';` (0 rows).
  Grep-verify no remaining `users.gamesPlayed` reference compiles anywhere.
- [ ] T012 [US2] Full local suite green: `npm run typecheck && npm run lint && npm run test && npm run test:e2e`
  (kill any stale port-3000 dev server first; the onboarding e2e must pass — it already reads `userGames` on main).

**Checkpoint**: Column gone locally, suite green, no onboarding regression.

---

## Phase 4: User Story 3 — Uniqueness is defense-in-depth, not the only guard (Priority: P3)

**Goal**: The clean "already in your list" behavior is driven by app logic independent of the DB constraint, and the
constraint is a backstop — both layers verifiably exercised.

### Tests / Implementation for User Story 3

- [ ] T013 [US3] Ensure `manage-games.test.ts` covers both layers explicitly: (a) the app-side path returns benign
  **without** attempting an insert (assert no second row and the friendly result), and (b) a would-be duplicate reaching
  the DB is absorbed by `onConflictDoNothing()` (no raw throw). If T003 already covers both, add a one-line assertion/
  comment making the two-layer intent explicit; otherwise add the missing case.

**Checkpoint**: Removing either layer in isolation would still prevent a visible duplicate — proven by the tests.

---

## Phase 5: Polish, Rollout & History

- [ ] T014 Production rollout (by hand, BEFORE merge): pull prod `DATABASE_URL` to a temp path **outside** the repo
  (extract without printing); run `dedupe-user-games` against prod → record `{ groups, deleted }`; apply the two idempotent
  DDL statements (create unique index; `DROP COLUMN IF EXISTS "gamesPlayed"`); verify index present + column absent
  (queries above); delete the temp env file. (Accepted micro-window per ADR 0016 — do the merge promptly after.)
- [ ] T015 [P] Update `CHANGELOG.md` (a user-facing line: no more duplicate games on your profile) and `status.md`; update
  `docs/future-work.md` — mark ADR-0015's two follow-ups (constraint + column drop) resolved, linking ADR 0016.
- [ ] T016 Commit (conventional, atomic per logical change), then — only after `main`'s greening CI is confirmed green and
  the full local suite passed — `git checkout main && git merge --no-ff 043-usergames-lockdown`, push, delete the branch;
  confirm the deploy's `drizzle-kit push` is a no-op and CI is green on the merge.
- [ ] T017 Publish the Patch Notes prod news post (player-facing wording) via `scripts/publish-patch-note.ts`, per the
  standing CHANGELOG→Patch-Notes workflow.

---

## Dependencies & Execution Order

- **T001 (Setup)** first — confirms assumptions before any edit.
- **US1 (T002–T008)** is the MVP and the prerequisite for the index: `dedupeUserGames` (T004) must exist and run before
  the index can be created (T007), since the index fails on duplicate rows. T002/T003 (tests) can be written in parallel
  with each other; T004 before T005/T007; T006 before T007; T008 independent of the index mechanics but tested against it.
- **US2 (T009–T012)** depends on US1's schema file being settled (both edit `src/db/schema.ts` — do US1's index add, then
  US2's column removal, sequentially, likely one commit for the schema file). T010's deletions require the column already
  unreferenced.
- **US3 (T013)** depends on US1's `addUserGame` + tests.
- **Rollout (T014–T017)** last. T014 (prod DDL) before T016 (merge) so the deploy push is a no-op. T016 gated on green main
  + green local suite. T017 after merge.

## Parallel Opportunities

- T002 and T003 (different test files) can be written in parallel.
- T015 (docs) is [P] against the merge mechanics but must be committed before/with T016.

## Implementation Strategy

MVP = US1 (duplicates impossible). US2 (drop column) and US3 (defense-in-depth) layer on. Validate the full suite incl.
e2e locally before any prod DDL, and do prod DDL by hand before merge so the auto-push is a verified no-op.

## Notes

- Same-file schema edits (index add + column drop) are sequential, not `[P]`.
- Watch the project traps: timestamp skew in ordering-sensitive tests (set explicit `createdAt`), `export {}` on sibling
  scripts, kill stale dev server before e2e, `err.cause.code` for postgres error codes if catching 23505 anywhere.
