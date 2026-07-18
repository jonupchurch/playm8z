---
description: "Task list for unifying a player's games into userGames"
---

# Tasks: One home for a player's games

**Input**: Design docs in `specs/042-unify-player-games/`

**Tests**: INCLUDED (Principle V) — the reconcile, the onboarding write, and the
backfill's safety guarantees are all covered.

## Format: `[ID] [P?] [Story] Description`

- **[Story]**: US1 (onboarding→userGames), US2 (backfill), US3 (deprecate)

---

## Phase 1: Foundational

- [x] T001 Create `src/lib/games/sync-onboarding-games.ts` —
  `syncOnboardingGames(userId, names)`: dedup `names` by `normalizeGame`, load the
  user's `userGames`, insert missing (rank/hours null), delete de-selected rows
  (by id, scoped to `userId`), never write `users.gamesPlayed`.
- [x] T002 `src/lib/games/sync-onboarding-games.test.ts` (real DB): inserts new,
  removes deselected, dedups normalized-equal names, is idempotent on the same set,
  and only touches the target user's rows.

---

## Phase 2: User Story 1 — onboarding games reach the profile + matching (P1) 🎯 MVP

**Goal**: onboarding game picks land in `userGames` so they show on the profile and
count in matching.

**Independent Test**: finish onboarding with 2 games → both appear on `/profile`
and in "in common"; deselect one → absent; duplicates collapse to one.

- [x] T003 [US1] Edit `src/app/api/onboarding/route.ts`: when the validated patch
  has `gamesPlayed`, `await syncOnboardingGames(userId, patch.gamesPlayed)` and
  `delete patch.gamesPlayed` (so `users` update never writes the column and an
  empty patch skips the update). Return `gamesPlayed` derived from the user's
  current `userGames` names.
- [x] T004 [US1] Edit `src/app/(auth)/onboarding/page.tsx`: prefill the wizard's
  games from the user's `userGames` names, not `users.gamesPlayed`.
- [x] T005 [US1] Test the onboarding route (mock `@/auth`, seed a user): a games
  PATCH creates the expected `userGames` rows, writes NOTHING to
  `users.gamesPlayed`, dedups, and removes a game on a follow-up PATCH without it.

**Checkpoint**: new players' onboarding games are live on profile + matching.

---

## Phase 3: User Story 2 — backfill existing affected players (P2)

**Goal**: recover pre-fix players safely.

**Independent Test**: empty-`userGames` player with `gamesPlayed` → seeded; curated
player → untouched; re-run → no change.

- [x] T006 [US2] Create `scripts/backfill-user-games.ts` (idempotent): for each
  user, skip if they have ≥1 `userGames` row; else if `gamesPlayed` non-empty,
  insert deduped (`normalizeGame`) names (rank/hours null). Report seeded /
  skipped-curated / empty. Reads `DATABASE_URL` (loadEnvFile `.env.local` fallback).
- [x] T007 [US2] `scripts` logic test (or a colocated helper test): seed-empty-only,
  curated-untouched, idempotent on re-run, dedup. (Extract the per-user decision
  into a testable helper if cleaner than testing the script end-to-end.)
- [x] T008 [US2] Run the backfill against LOCAL; verify seeded/curated/idempotent by
  query.

**Checkpoint**: existing players recovered; nobody's curated list disturbed.

---

## Phase 4: User Story 3 — retire `users.gamesPlayed` (P3)

- [x] T009 [US3] Update the `users.gamesPlayed` schema comment to "deprecated /
  retired (042)"; grep the product and confirm no remaining read/write of
  `users.gamesPlayed` beyond the field definition and `gamesPlayedSchema` input
  shape. Fix any stragglers (e.g. the onboarding route's `profileColumns` select).

---

## Phase 5: Prod, docs, patch note

- [x] T010 [P] Update `CHANGELOG.md` (player-facing bug fix), `status.md`, and
  `docs/future-work.md` (mark the two-stores entry resolved by 042; log the
  deferred column DROP + the possible `userGames` unique constraint).
- [x] T011 Run the backfill against PROD (prod `DATABASE_URL` pulled to a temp path
  outside the repo, used, deleted); verify the report.
- [x] T012 Run `npm run typecheck`, `npm run lint`, `npm test` green; walk
  `quickstart.md` US1 + US2 locally.
- [x] T013 [P] Publish a **Patch Notes** post to prod for the fix (player-facing:
  "the games you pick at signup now show on your profile and drive matching"),
  dry-run local first, per the patch-notes workflow.

---

## Dependencies

- T001 → T002/T003/T005. T003 → T009 (route is a `gamesPlayed` reader to fix).
- US1 (T003–T005) is the MVP; US2 (T006–T008) and US3 (T009) follow.
- T011 (prod backfill) after the feature verifies locally; T010/T012/T013 last.
