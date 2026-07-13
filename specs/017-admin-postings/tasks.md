---

description: "Task list for Admin Postings implementation"
---

# Tasks: Admin Postings

**Input**: Design documents from `/specs/017-admin-postings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the computed-severity/queue-membership/auto-flag-ruleset logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-role.ts` (Error Pages, `002`) and `src/lib/actions/toggle-user-ban.ts` (Admin Users, `016`) exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema extensions, validation schemas, and gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Extend `postings` with `autoFlagReason` and `moderationReviewedAt`, and add the new `warnings` table, in `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/admin-postings.ts` — Zod schemas for the filter and the resolve/ban actions (data-model.md)
- [ ] T005 Build `src/app/admin/postings/page.tsx` shell, gated by `require-role.ts` (moderator minimum) — depends on T001

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Moderator views and filters the moderation queue (Priority: P1) 🎯 MVP

**Goal**: Accurate stats, filter chips (All/User-reported/Auto-flagged), and computed severity on every queue card.

**Independent Test**: Confirm stats/filter/severity accuracy against seeded data; confirm access denial for a non-moderator (quickstart.md Scenario 1-3, 8).

### Tests for User Story 1

- [ ] T006 [P] [US1] Unit tests for `admin-postings.ts`'s schemas in `src/lib/validations/admin-postings.test.ts`
- [ ] T007 [P] [US1] Unit tests for `get-posting-queue.ts` (queue-membership formula, computed severity, filter narrowing) in `src/lib/admin/get-posting-queue.test.ts`
- [ ] T008 [US1] Playwright e2e covering stats, filters, computed severity, empty state, and access-denial for a non-moderator, including an axe-core scan — creates `e2e/admin-postings.spec.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Build `src/lib/admin/get-posting-queue.ts` (research.md #1 for computed severity, #4 for queue-membership) — depends on T002, T004
- [ ] T010 [US1] Build `src/components/admin/posting-queue.tsx` (stats cards, filter chips, queue cards incl. reason chips and AUTO-FLAG banner) — depends on T009
- [ ] T011 [US1] Wire `posting-queue.tsx` into `src/app/admin/postings/page.tsx` — depends on T005, T010

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Moderator reviews a posting in the drawer and resolves it (Priority: P2)

**Goal**: A review drawer (full posting, "why it's here," author card) with Approve/Remove, both logging an audit entry.

**Independent Test**: Open a queue item's drawer, confirm its content, Approve one item and Remove another, confirming reports resolve, `removedAt`/`moderationReviewedAt` update correctly, "removed today" increments, and an audit entry is recorded each time (quickstart.md Scenario 4-5).

### Tests for User Story 2

- [ ] T012 [P] [US2] Integration test for `resolve-posting-report.ts`'s approve/remove resolutions (report resolution, `moderationReviewedAt`/`removedAt` effects, audit-log write, role-gate rejection) in `src/lib/actions/resolve-posting-report.test.ts`
- [ ] T013 [P] [US2] Unit/integration test for `get-posting-review.ts` (drawer data: posting, "why it's here," author card) in `src/lib/admin/get-posting-review.test.ts`
- [ ] T014 [US2] Add the drawer/approve/remove scenario to `e2e/admin-postings.spec.ts` — depends on T008 (same file)

### Implementation for User Story 2

- [ ] T015 [US2] Build `src/lib/admin/get-posting-review.ts` (posting, reports with reporters, auto-flag reason, author's prior-warnings/total-posts counts) — depends on T002
- [ ] T016 [US2] Build `src/lib/actions/resolve-posting-report.ts` supporting `approve`/`remove` (resolves open reports, sets `moderationReviewedAt` or `removedAt`, calls `logAuditEntry()`) — depends on T004
- [ ] T017 [US2] Build `src/components/admin/posting-review-drawer.tsx` (dialog/panel, focus trap, "why it's here," author card, Approve/Remove buttons) — depends on T015, T016
- [ ] T018 [US2] Wire `posting-review-drawer.tsx` into `src/app/admin/postings/page.tsx`, opened via each card's Review action — depends on T011, T017

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Moderator warns or bans the author from the drawer (Priority: P3)

**Goal**: Warn author (writes a `warnings` row, same queue-clearing effect as Approve) and Ban author (reuses `016`'s ban action, also removes the posting).

**Independent Test**: Warn an author from the drawer and confirm a `warnings` row exists and their prior-warnings count increases on Admin Users; ban an author from the drawer and confirm their account is banned and the posting under review is removed (quickstart.md Scenario 6-7).

### Tests for User Story 3

- [ ] T019 [P] [US3] Integration test for `resolve-posting-report.ts`'s `warn` resolution (creates a `warnings` row; same report-resolution/`moderationReviewedAt` effect as approve) — extends `src/lib/actions/resolve-posting-report.test.ts` (same file as T012)
- [ ] T020 [P] [US3] Integration test for `ban-posting-author.ts` (delegates to `016`'s `toggle-user-ban.ts`; removes the posting under review; role-gate rejection) in `src/lib/actions/ban-posting-author.test.ts`
- [ ] T021 [US3] Add the warn/ban scenario to `e2e/admin-postings.spec.ts` — depends on T014 (same file)

### Implementation for User Story 3

- [ ] T022 [US3] Extend `resolve-posting-report.ts` to support the `warn` resolution (inserts a `warnings` row; same resolution/audit-log path as approve) — depends on T016
- [ ] T023 [US3] Build `src/lib/actions/ban-posting-author.ts` (calls `016`'s `toggle-user-ban.ts`, then removes the posting under review via the same path as `remove`) — depends on T016
- [ ] T024 [US3] Wire Warn/Ban buttons into `posting-review-drawer.tsx` — depends on T017, T022, T023

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Cross-Feature Amendments (bounded — research.md #2, #5, #6)

**Purpose**: Small, single-purpose additions to already-merged features' existing files, per spec.md's FR-012/FR-013. Each is independent of the others and of this feature's own new files above (only needs the schema from T002).

- [ ] T025 [P] Amend `src/lib/actions/create-posting.ts` (`005-post-game`): add the fixed auto-flag ruleset (banned-phrase/external-link pattern → `phishing_or_scam`; boosting-service keywords → `boosting_service`; new-account first-post → `new_account_first_post`), setting `autoFlagReason` at insert — depends on T002
- [ ] T026 [P] Amend `src/lib/actions/toggle-user-ban.ts` and `src/lib/actions/remove-user-content.ts` (`016-admin-users`): add the `logAuditEntry()` call each was always intended to get — depends on T002
- [ ] T027 [P] Amend `src/lib/admin/get-dashboard-kpis.ts` and `src/lib/admin/get-top-games.ts` (`015-admin-dashboard`): add `AND removedAt IS NULL` to their `status = 'open'` filters — depends on T002
- [ ] T028 [P] Extend `src/lib/actions/create-posting.test.ts` (`005`), `src/lib/actions/toggle-user-ban.test.ts` and `src/lib/actions/remove-user-content.test.ts` (`016`), and `src/lib/admin/get-dashboard-kpis.test.ts` and `src/lib/admin/get-top-games.test.ts` (`015`) to cover T025-T027's new behavior — depends on T025, T026, T027

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T029 Confirm `next build` succeeds locally and CI stays green with the new gated route, four Server Actions (plus the reused `016` ban action), the extended schema, and the five amended files
- [ ] T030 Manually run quickstart.md Scenarios 1-10 end to end against local dev and confirm each passes
- [ ] T031 [P] Update `docs/feature-list.md`, marking Admin Postings' spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T010 (drawer opens from the queue's Review action); T014 depends on US1's T008 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T016/T017 (extends the same resolution action and drawer); T021 depends on US2's T014 (same file).
- **Cross-Feature Amendments (Phase 6)**: Depends on Foundational (T002) only — independent of Phases 3-5, can run any time after T002 lands.
- **Polish (Phase 7)**: Depends on all three user stories and Phase 6.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/admin-postings.spec.ts` (T008) accumulates scenarios across all three stories — same file, sequential.
- `src/app/admin/postings/page.tsx` (T005/T011) is extended by US2 (T018) — same file, sequential.
- `resolve-posting-report.ts` (T016) is extended by US3 (T022) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004) can run once T002/T003 land.
- Phase 6's four amendment tasks (T025-T028) touch different already-merged features' files, are independent of Phases 3-5, and can run in parallel with each other and with any user story once T002 lands.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-3, 8 independently
5. Moderators can see an accurate, filterable moderation queue — the
   smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (drawer + approve/remove)
4. User Story 3 → validate independently (warn/ban)
5. Cross-Feature Amendments → can be done any time after Foundational, validated via the extended existing test files
6. Polish → build/CI confirmation, quickstart run-through, doc update
