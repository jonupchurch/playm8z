---

description: "Task list for Profile + Account settings implementation"
---

# Tasks: Profile + Account settings

**Input**: Design documents from `/specs/007-profile-and-account-settings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on every new Zod schema plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3/US4

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm Auth & Onboarding's `src/lib/email/send-verification-email.ts` and Post a Game's `src/lib/validations/posting.ts` exist in the codebase before starting — both are direct dependencies of this feature's email-change and posting-edit paths

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The extended `user` table, the new tables, the validation schemas, and the shared layout every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Extend `user` (`bio`, `createdAt`, four privacy booleans, `deactivatedAt`) and add the `userGames` and `savedListings` tables in `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/profile.ts` — every Zod schema this feature needs (data-model.md)
- [ ] T005 Build `src/app/profile/layout.tsx`: header (avatar, name, handle, joined date, a trivially-true Online badge, research.md's own-profile reasoning) plus the four tab links — depends on T002

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - User views and edits their own profile (Priority: P1) 🎯 MVP

**Goal**: Edit personal info, manage a games list, change password (Credentials only), and change email with re-verification.

**Independent Test**: Edit display name/region/bio and confirm persistence; add/remove a game; change password correctly and incorrectly; confirm no password section for a Google-only account; change email and confirm re-verification (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T006 [P] [US1] Unit tests for `profile.ts`'s schemas (name/region/bio, game/rank/hours, password rules) in `src/lib/validations/profile.test.ts`
- [ ] T007 [P] [US1] Integration test for `update-profile.ts` (persists name/region/bio) in `src/lib/actions/update-profile.test.ts`
- [ ] T008 [P] [US1] Integration test for `manage-games.ts` (add/remove `UserGame` rows) in `src/lib/actions/manage-games.test.ts`
- [ ] T009 [P] [US1] Integration test for `change-password.ts` (correct current password succeeds; incorrect is rejected) in `src/lib/actions/change-password.test.ts`
- [ ] T010 [P] [US1] Integration test for `update-email.ts` (resets `emailVerified`, sends a new verification email) in `src/lib/actions/update-email.test.ts`
- [ ] T011 [US1] Playwright e2e spec covering profile/games/password/email edits, including the Google-only-account password-section-hidden check, with an axe-core scan — creates `e2e/profile.spec.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Build `update-profile.ts` in `src/lib/actions/update-profile.ts` — depends on T004
- [ ] T013 [US1] Build `manage-games.ts` in `src/lib/actions/manage-games.ts` — depends on T004
- [ ] T014 [US1] Build `change-password.ts` in `src/lib/actions/change-password.ts` (research.md #2) — depends on T004
- [ ] T015 [US1] Build `update-email.ts` in `src/lib/actions/update-email.ts`, reusing Auth & Onboarding's verification-email helper (research.md #4) — depends on T004
- [ ] T016 [US1] Build `src/components/profile/games-list.tsx` — depends on T013
- [ ] T017 [US1] Build `src/app/profile/page.tsx` (Overview): games list, active-postings preview, public-info sidebar — depends on T005, T016
- [ ] T018 [US1] Build `src/app/profile/account/page.tsx`: personal-info form, password section (conditional on a set password), email section — depends on T005, T012, T014, T015

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - User manages their own postings (Priority: P2)

**Goal**: View all owned postings with status/applicant count; edit before acceptance; close/reopen.

**Independent Test**: Edit a posting with no accepted applicants (succeeds); confirm Edit is unavailable once one is accepted; close and reopen a posting (quickstart.md Scenario 2).

### Tests for User Story 2

- [ ] T019 [P] [US2] Integration test for `manage-posting.ts` (edit succeeds pre-acceptance; blocked once an application is accepted; close/reopen toggles status) in `src/lib/actions/manage-posting.test.ts`
- [ ] T020 [US2] Add the My postings scenario to `e2e/profile.spec.ts` — depends on T011 (same file)

### Implementation for User Story 2

- [ ] T021 [US2] Build `manage-posting.ts` in `src/lib/actions/manage-posting.ts`, reusing Post a Game's validation schemas (research.md #5) — depends on T004
- [ ] T022 [US2] Build `src/components/profile/posting-management-card.tsx`: status, applicant count, conditional Edit, Close/Reopen — depends on T021
- [ ] T023 [US2] Build `src/app/profile/postings/page.tsx` — depends on T005, T022

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - User saves and manages bookmarked listings (Priority: P3)

**Goal**: View saved listings; unsave; see an empty state with none saved.

**Independent Test**: Save a listing from Listing detail, confirm it appears here; unsave from either surface; confirm the empty state with none saved (quickstart.md Scenario 3).

### Tests for User Story 3

- [ ] T024 [US3] Add the Saved-tab scenario (appears, unsave from either surface, empty state) to `e2e/profile.spec.ts` — depends on T020 (same file)

### Implementation for User Story 3

- [ ] T025 [US3] Build `src/app/profile/saved/page.tsx`: lists `savedListings` joined with `postings`, reuses Listing detail's `toggle-saved-listing.ts` (`006-listing-detail`) for unsave, empty state with a path to Browse — depends on T005

**Checkpoint**: User Stories 1, 2, and 3 all work independently.

---

## Phase 6: User Story 4 - User controls privacy and can deactivate their account (Priority: P4)

**Goal**: Persisted privacy toggles; a single Deactivate action with automatic reactivation on next login.

**Independent Test**: Toggle privacy settings and confirm persistence; deactivate and confirm hidden status; log back in and confirm automatic reactivation (quickstart.md Scenario 4).

### Tests for User Story 4

- [ ] T026 [P] [US4] Integration test for `update-privacy.ts` (each toggle persists independently) in `src/lib/actions/update-privacy.test.ts`
- [ ] T027 [P] [US4] Integration test for `deactivate-account.ts` and the `src/auth.ts` reactivation-on-login addition (research.md #3) in `src/lib/actions/deactivate-account.test.ts`
- [ ] T028 [US4] Add the privacy-toggle and deactivate/reactivate scenarios to `e2e/profile.spec.ts` — depends on T024 (same file)

### Implementation for User Story 4

- [ ] T029 [US4] Build `update-privacy.ts` in `src/lib/actions/update-privacy.ts` — depends on T004
- [ ] T030 [US4] Build `deactivate-account.ts` in `src/lib/actions/deactivate-account.ts` and add the reactivation-on-sign-in check to `src/auth.ts` (research.md #3) — depends on T004
- [ ] T031 [US4] Build `src/components/profile/privacy-toggles.tsx` and `src/components/profile/danger-zone.tsx` (Deactivate with a confirmation step, per Principle III) — depends on T029, T030
- [ ] T032 [US4] Wire `privacy-toggles.tsx` and `danger-zone.tsx` into `src/app/profile/account/page.tsx` — depends on T018, T031

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T033 Confirm `next build` succeeds locally and CI stays green with the four new routes, ~7 Server Actions, the `src/auth.ts` change, and the extended schema
- [ ] T034 Manually run quickstart.md Scenarios 1-4 end to end against local dev and confirm each passes
- [ ] T035 [P] Update `docs/feature-list.md`, marking Profile's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; T020 depends on US1's T011 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational; T024 depends on US2's T020 (same file).
- **User Story 4 (Phase 6)**: Depends on Foundational and US1's T018 (extends the Account page); T028 depends on US3's T024 (same file).
- **Polish (Phase 7)**: Depends on all four user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/profile.spec.ts` (T011) accumulates scenarios across all four stories — same file, sequential.
- `src/app/profile/account/page.tsx` (T018) is extended by US4 (T032) — same file, sequential.

### Parallel Opportunities

- US1's integration tests (T007-T010) can all run in parallel; its four Server Actions (T012-T015) touch different files and can be built in parallel.
- US4's tests (T026-T027) and Server Actions (T029-T030) can run/be built in parallel with each other.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. A user can view and edit their own profile, games, password, and
   email — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (own-postings management)
4. User Story 3 → validate independently (saved listings)
5. User Story 4 → validate independently (privacy + deactivate)
6. Polish → build/CI confirmation, quickstart run-through, doc update
