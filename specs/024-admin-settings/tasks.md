---

description: "Task list for Admin Settings implementation"
---

# Tasks: Admin Settings

**Input**: Design documents from `/specs/024-admin-settings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the computed auto-hide/ban-review-badge logic and the settings-driven auto-flag rules, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Confirm `src/lib/auth/require-role.ts` and the `settings` table (`002`), `src/lib/moderation/auto-flag-rules.ts` (`017`/`018`), `src/lib/postings/get-open-postings.ts`/`search-postings.ts`/`src/lib/forum/search-threads.ts` (`003`/`004`/`009`), `001`'s sign-up path, and `022`'s profile sidebar all exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema extensions, validation schemas, base queries, and the admin-only gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Extend the `settings` table (`002`) with all new fields, and `user.role`'s allowed values (`support`/`viewer`), in `src/db/schema.ts` (data-model.md)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 [P] Create `src/lib/validations/admin-settings.ts` — Zod schemas for every section's save action (data-model.md)
- [x] T005 Build `src/app/admin/settings/page.tsx` shell, gated by `require-role.ts` at `admin` specifically (stricter than every other admin page) — depends on T001
- [x] T006 [P] Extend `src/lib/admin/get-settings.ts` (`002`) to read every new field — depends on T002
- [x] T007 [P] Build `src/lib/admin/get-team.ts` (team list, role ≥ `support`) — depends on T002

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Admin configures general settings and maintenance mode (Priority: P1) 🎯 MVP

**Goal**: A real, working maintenance-mode toggle (closing `002`'s own anticipated loop) and persisted general site metadata.

**Independent Test**: Toggle maintenance mode and confirm its real platform-wide effect; confirm the admin-only gate rejects a moderator (quickstart.md Scenario 1-3, 12).

### Tests for User Story 1

- [x] T008 [P] [US1] Unit tests for `admin-settings.ts`'s general/maintenance schemas in `src/lib/validations/admin-settings.test.ts`
- [x] T009 [P] [US1] Integration test for `toggle-maintenance-mode.ts` (real effect on `002`'s enforcement path, admin-gate rejection for a moderator session, audit-log write) in `src/lib/actions/toggle-maintenance-mode.test.ts`
- [x] T010 [US1] Playwright e2e covering the admin-only gate and the General/maintenance-mode save flows, including an axe-core scan — creates `e2e/admin-settings.spec.ts`

### Implementation for User Story 1

- [x] T011 [US1] Build `src/lib/actions/save-general-settings.ts` (site name/tagline/support email/default theme; `logAuditEntry()`) — depends on T004
- [x] T012 [US1] Build `src/lib/actions/toggle-maintenance-mode.ts` (`002`'s existing enforcement path; `logAuditEntry()`) — depends on T004
- [x] T013 [US1] Build `src/components/admin/settings-general.tsx` — depends on T006, T011, T012
- [x] T014 [US1] Wire the section-nav shell and General section into `src/app/admin/settings/page.tsx` — depends on T005, T013

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Admin configures moderation and auto-flag rules (Priority: P2)

**Goal**: Real, working banned-phrases/filter-toggle configuration for `auto-flag-rules.ts`, a computed auto-hide-after-N-reports rule, and a display-only ban-review severity badge.

**Independent Test**: Add/remove a banned phrase and a filter toggle and confirm real effect on newly-created content's auto-flagging; set the auto-hide threshold and confirm the computed public-visibility effect and automatic self-correction on report resolution (quickstart.md Scenario 4-6).

### Tests for User Story 2

- [x] T015 [P] [US2] Integration test for `save-moderation-settings.ts` (banned phrases, filter toggles, auto-hide enable/threshold, escalate-severity; audit-log write) in `src/lib/actions/save-moderation-settings.test.ts`
- [x] T016 [P] [US2] Integration test for `auto-flag-rules.ts`'s settings-driven behavior (reads `bannedPhrases` and the three filter toggles instead of hardcoded constants) — extends `017`'s/`018`'s existing `auto-flag-rules.test.ts`
- [x] T017 [P] [US2] Integration test for the auto-hide computed exclusion (a sufficiently-reported row disappears from Home/Browse/Forum index when enabled, reappears once its open-report count drops below threshold) — extends `003`'s/`004`'s/`009`'s existing test files
- [x] T018 [P] [US2] Integration test for the "needs ban review" badge (computed severity vs. the configured threshold) — extends `017`'s/`018`'s/`019`'s existing queue-query test files
- [x] T019 [US2] Add the moderation-settings scenario to `e2e/admin-settings.spec.ts` — depends on T010 (same file)

### Implementation for User Story 2

- [x] T020 [US2] Build `src/lib/actions/save-moderation-settings.ts` — depends on T004
- [x] T021 [US2] Amend `src/lib/moderation/auto-flag-rules.ts` (`017`/`018`): read `settings.bannedPhrases` and the three filter-toggle booleans instead of hardcoded constants (research.md #3) — depends on T002
- [x] T022 [US2] Amend `src/lib/postings/get-open-postings.ts` (`003`), `src/lib/postings/search-postings.ts` (`004`), and `src/lib/forum/search-threads.ts` (`009`): add the computed auto-hide exclusion, their second amendment each (research.md #2) — depends on T002
- [x] T023 [US2] Amend `src/lib/admin/get-posting-queue.ts` (`017`), `get-forum-queue.ts` (`018`), and `get-reports-queue.ts` (`019`): add the computed "needs ban review" badge (research.md #4) — depends on T002
- [x] T024 [US2] Build `src/components/admin/settings-moderation.tsx` — depends on T006, T020
- [x] T025 [US2] Wire the Moderation section into `page.tsx` — depends on T014, T024

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Admin manages team roles, feature flags, and remaining safety settings (Priority: P3)

**Goal**: Team role assignment/removal, existing-user invite-by-email, Open Signups' real enforcement, Discoverable-by-default's real effect at account creation, and the retroactive Public Profile privacy fix.

**Independent Test**: Change/remove a team member's role and confirm access effect; invite an existing and a nonexistent email; toggle Open Signups and confirm sign-up rejection; toggle Discoverable-by-default and confirm a new account's default; confirm Public Profile now honors `showRegion`/`showAgeGroup` (quickstart.md Scenario 7-11).

### Tests for User Story 3

- [x] T026 [P] [US3] Integration test for `assign-team-role.ts` (by-email lookup and role assignment; clear not-found message for a nonexistent email; admin-gate rejection) in `src/lib/actions/assign-team-role.test.ts`
- [x] T027 [P] [US3] Integration test for `remove-team-member.ts` (reverts `role` to `user`, never a ban/deletion) in `src/lib/actions/remove-team-member.test.ts`
- [x] T028 [P] [US3] Integration test for `save-feature-flags.ts` (persists all six flags; audit-log write) in `src/lib/actions/save-feature-flags.test.ts`
- [x] T029 [P] [US3] Integration test for `save-safety-settings.ts` (persists `discoverableByDefault`; audit-log write) in `src/lib/actions/save-safety-settings.test.ts`
- [x] T030 [P] [US3] Integration test for `001`'s amended sign-up path (rejects new sign-ups when `openSignups` is false; existing logins unaffected) and account-creation path (initializes `discoverable` from `discoverableByDefault`) — extends `001`'s existing test files
- [x] T031 [P] [US3] Integration test for `022`'s amended sidebar (omits Region/Age group when the viewed user's `showRegion`/`showAgeGroup` is false) — extends `022`'s existing test file
- [x] T032 [US3] Add the roles/feature-flags/safety scenarios to `e2e/admin-settings.spec.ts` — depends on T019 (same file)

### Implementation for User Story 3

- [x] T033 [US3] Build `src/lib/actions/assign-team-role.ts` (research.md #6) — depends on T004
- [x] T034 [US3] Build `src/lib/actions/remove-team-member.ts` — depends on T004
- [x] T035 [US3] Build `src/lib/actions/save-feature-flags.ts` — depends on T004
- [x] T036 [US3] Build `src/lib/actions/save-safety-settings.ts` — depends on T004
- [x] T037 [US3] Amend `001`'s sign-up path (reject when `openSignups` is false) and account-creation path (initialize `discoverable` from `discoverableByDefault`) — depends on T002
- [x] T038 [US3] Amend `022`'s profile sidebar component: honor `showRegion`/`showAgeGroup` (`007`) — the real gap fix (research.md #7) — depends on T002
- [x] T039 [US3] Build `src/components/admin/settings-roles.tsx`, `settings-features.tsx`, and `settings-safety.tsx` — depends on T007, T033, T034, T035, T036
- [x] T040 [US3] Wire the Roles & access, Feature flags, and Safety sections into `page.tsx` — depends on T025, T039

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T041 Confirm `next build` succeeds locally and CI stays green with the new admin-only route, seven Server Actions, the extended schema, and every amended file (`017`/`018`/`019`, `003`/`004`/`009`, `001`, `022`)
- [x] T042 Manually run quickstart.md Scenarios 1-12 end to end against local dev and confirm each passes
- [x] T043 [P] Update `docs/feature-list.md`, marking Admin Settings' spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T014 (extends the same section-nav page); T019 depends on US1's T010 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T025 (extends the same page); T032 depends on US2's T019 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/admin-settings.spec.ts` (T010) accumulates scenarios across all three stories — same file, sequential.
- `src/app/admin/settings/page.tsx` (T005/T014) is extended by US2 (T025) and US3 (T040) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T006, T007) can run once T002/T003 land.
- US2's three amendment tasks (T021-T023) touch different already-merged features' files and can run in parallel with each other.
- US3's four new Server Actions (T033-T036) and its two amendment tasks (T037-T038) are all independent files/features and can run largely in parallel once Foundational lands.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-3, 12
   independently
5. An admin can finally flip maintenance mode for real — the single
   most anticipated capability this feature ships, and the smallest
   useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP — maintenance mode +
   general settings)
3. User Story 2 → validate independently (moderation/auto-flag
   configurability, auto-hide, ban-review badge)
4. User Story 3 → validate independently (roles, feature flags,
   safety, incl. the Public Profile gap fix)
5. Polish → build/CI confirmation, quickstart run-through, doc update
