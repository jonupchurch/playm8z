---

description: "Task list for Admin-editable Suggested Games"
---

# Tasks: Admin-editable Suggested Games

**Input**: Design documents from `/specs/031-admin-suggested-games/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (no contracts/ — Server Actions are this project's internal-RPC pattern, see plan.md). **Also: feature 030 should be merged first** (research.md #2 — it creates the Lists tab and the save action this feature extends).

**Tests**: Included — Principle V. Less logic here than 030 (research.md #3: there is no validation coupling at all), so the tests concentrate on the guardrails and on the one property that must never break — that the list is a suggestion, not a catalog.

**Organization**: By user story. US1 (an admin curates) and US2 (edits never touch a player) are both P1 and ship together.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Setup/Foundational/Polish tasks have no story label

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The stored list must exist and be readable before anything consumes it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 **Take `main` into this branch first** if feature 030 has merged. This branch was cut from `main` before 030, and 030 creates the Lists tab, `settings-lists.tsx`, and `save-lists-settings.ts` that this feature extends (research.md #2). Skipping this means both features independently create a Lists tab and the second merge conflicts. If 030 was dropped, this feature inherits creating the tab — T005/T006 then become "create" rather than "extend".
- [ ] T002 Add `suggestedGames: text("suggestedGames").array().notNull().default([...])` to `settings` in `src/db/schema.ts`, beside `genres`/`bannedPhrases`. Default is exactly today's fourteen games (data-model.md) — mind the punctuation: `Baldur's Gate 3`, `D&D 5e`, `Magic: The Gathering`. Apply with `drizzle-kit push` and verify via `information_schema` that the column landed; `db:migrate` has silently no-op'd on every schema-changing feature here.
- [ ] T003 Move the `SUGGESTED_GAMES` const out of `src/components/auth/onboarding-wizard.tsx:18-33` and into `src/lib/validations/onboarding.ts` as `DEFAULT_SUGGESTED_GAMES`, commented as the column default/seed **only** — not read at request time (research.md #7).
- [ ] T004 Extend `src/lib/settings/get-settings.ts` to include and Zod-validate `suggestedGames`, adding it to that module's `DEFAULTS` fallback so a parse failure degrades to today's list rather than an empty one (which would strand new users at the games step).

**Checkpoint**: The list is stored, defaulted, and readable.

---

## Phase 2: User Story 1 — An admin curates what new players are offered (Priority: P1) 🎯 MVP

**Goal**: An admin adds/removes a game; the next new account sees it at the games step.

**Independent Test**: quickstart.md Scenario 1 — add `Palworld`, then create a brand-new account and see it offered.

- [ ] T005 [US1] Extend `saveListsSettingsSchema` in `src/lib/validations/admin-settings.ts` to carry `suggestedGames` alongside 030's `genres`: array of trimmed non-empty strings, min length 1 (FR-009), case-insensitive duplicate `.refine()` (FR-010), casing preserved as typed (FR-013).
- [ ] T006 [US1] Extend `src/lib/actions/save-lists-settings.ts` to persist `suggestedGames` too — **one tab, one save, one audit entry per save**, not a second action for the same tab. Keep the chain: `requireRole("admin")` (FR-011) → parse → `upsertSettings()` → `logAuditEntry()` (FR-012) → `revalidatePath`. Must go through `upsertSettings` — it is what calls `invalidateSettingsCache()`; `revalidatePath` alone does not touch that cache (research.md #6).
- [ ] T007 [US1] Add a **Suggested games** section to `src/components/admin/settings-lists.tsx`, reusing the same chip editor as the genres section. Remove buttons need accessible names naming **which** game they remove.
- [ ] T008 [US1] `src/app/(auth)/onboarding/page.tsx` reads `suggestedGames` and passes it to `<OnboardingWizard>` as a prop; the wizard renders the prop at its games step (`onboarding-wizard.tsx:336`). It is already an `async` server component passing props, so this is one prop (research.md #5). **Prop, not import** — a client component importing a runtime value from a module reaching `@/db` crashes the page.
- [ ] T009 [US1] Vitest for the save action's `suggestedGames` path: an admin save persists; a moderator is rejected (FR-011); an audit entry is written (FR-012). **`settings` is a shared singleton row** — restore every field in `afterAll`/`finally`, not only on the success path.

**Checkpoint**: The core promise works end-to-end.

---

## Phase 3: User Story 2 — Editing suggestions never touches anybody's profile (Priority: P1)

**Goal**: The list is a suggestion, not a constraint — and provably so.

**Independent Test**: quickstart.md Scenarios 2 and 3.

- [ ] T010 [US2] **Confirm and leave alone**: `gamesPlayedSchema` at `src/lib/validations/onboarding.ts:61` stays `z.array(z.string().trim().min(1))`. Do **not** validate a player's games against `suggestedGames`. This task is deliberately a no-op with a comment: tightening it would present as better validation and would in fact create the curated Game catalog ADR 0001 rejects, breaking FR-007 (research.md #3).
- [ ] T011 [P] [US2] Vitest: removing a game from `suggestedGames` leaves `users.gamesPlayed` untouched for a player who lists it (FR-006), and a player can still be given a game absent from the list (FR-007, SC-006).
- [ ] T012 [US2] Playwright e2e (`e2e/admin-suggested-games.spec.ts`): as a real seeded admin, add a game → create a **brand-new** account and assert the game is offered at the games step (SC-001); remove a game → assert an existing player who lists it still lists it (SC-003). An existing session cannot exercise this — the suggestions only appear during account creation. Restore `settings.suggestedGames` in `afterAll` **unconditionally**. Assert on the DB only after an observable UI success signal.

**Checkpoint**: US1 + US2 together are the shippable feature.

---

## Phase 4: User Story 3 — The list cannot strand a newcomer (Priority: P2)

**Goal**: Guardrails hold and are proven.

**Independent Test**: quickstart.md Scenarios 4 and 5.

- [ ] T013 [P] [US3] Vitest for the schema: empty list rejected (FR-009) — load-bearing here, since the games step has no free-text input and an empty list is a dead end (research.md #4); blank entry rejected; `valorant` vs `Valorant` rejected as a duplicate (FR-010); `Baldur's Gate 3`, `D&D 5e` and `Magic: The Gathering` round-trip exactly (FR-013) — apostrophes, ampersands and colons are the values an over-eager sanitiser mangles.
- [ ] T014 [US3] e2e or manual: the games step is still skippable regardless of the list's contents (FR-014), so onboarding can always complete (SC-005).

---

## Phase 5: Polish

- [ ] T015 [P] Update `CHANGELOG.md`, `status.md`, and `docs/feature-list.md` (entry 31).
- [ ] T016 [P] Confirm `docs/future-work.md` records the `users.gamesPlayed` vs `userGames` split (research.md #8) — a real defect this feature deliberately does not fix. Add it if absent.
- [ ] T017 Run the full suite (`npm test`, `npm run test:e2e`) and **check the reporter's count against `npx playwright test --list`** — a local e2e run has silently under-run here and reported green while skipping ~31 tests.
- [ ] T018 Walk quickstart.md by hand. Scenario 3 (a game absent from the suggestions can still be added from the profile) is the one that guards ADR 0001 and the one most likely to have been "helpfully" broken.

---

## Dependencies

- **T001 first** if 030 has merged — otherwise the tab work conflicts.
- **Phase 1 blocks everything.**
- T005 → T006 → T007; T008 depends on T004 only.
- T012 depends on Phase 2.
- **US1 and US2 ship together.** US2 is mostly proof rather than code (T010 is a deliberate no-op), but it is the half that keeps the list from becoming a catalog.
