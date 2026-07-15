---

description: "Task list for Admin Reports implementation"
---

# Tasks: Admin Reports

**Input**: Design documents from `/specs/019-admin-reports/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the grouping/severity/classification/aggregate logic, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently. Cross-feature amendments (to `011`, and retroactively to `017`/`018`) are grouped in their own phases since they're independent of this feature's own new files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Confirm `src/lib/auth/require-role.ts` (`002`), `src/lib/actions/toggle-user-ban.ts` (`016`), `src/lib/actions/resolve-posting-report.ts` (`017`), `src/lib/actions/resolve-forum-report.ts` (`018`), and `src/lib/moderation/reason-severity.ts` (`018`) exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema extensions, the extracted classification helper, the severity correction, validation schemas, and the gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add `reports.resolvedAt` and `messages.removedAt` in `src/db/schema.ts` (data-model.md)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 [P] Extract shared `src/lib/moderation/classify-forum-target.ts` from `018`'s inline thread-vs-reply classification (research.md #7)
- [x] T005 [P] Correct `src/lib/moderation/reason-severity.ts` (`018`): `impersonation` → high severity (research.md #6)
- [x] T006 [P] Create `src/lib/validations/admin-reports.ts` — Zod schemas for the filter and the resolve/ban actions (data-model.md)
- [x] T007 Build `src/app/admin/reports/page.tsx` shell, gated by `require-role.ts` (moderator minimum) — depends on T001

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Moderator views and filters the unified report queue (Priority: P1) 🎯 MVP

**Goal**: Accurate stats, a queue grouped by reported target with a "N reports" badge, filterable by target type, with corrected computed severity.

**Independent Test**: Confirm stats/grouping/filter/severity accuracy against seeded data across all four target types; confirm access denial for a non-moderator (quickstart.md Scenario 1-4, 11).

### Tests for User Story 1

- [x] T008 [P] [US1] Unit tests for `get-reports-queue.ts` (grouping by target, severity via the corrected shared helper, target-type filter) in `src/lib/admin/get-reports-queue.test.ts`
- [x] T009 [P] [US1] Unit tests for `admin-reports.ts`'s schemas in `src/lib/validations/admin-reports.test.ts`
- [x] T010 [US1] Playwright e2e covering stats, grouping, filters, computed severity, empty state, and access-denial for a non-moderator, including an axe-core scan — creates `e2e/admin-reports.spec.ts`

### Implementation for User Story 1

- [x] T011 [US1] Build `src/lib/admin/get-reports-queue.ts` (research.md #1 for grouping, #7 for forum classification, #8 for the filter/query pattern) — depends on T002, T004, T005, T006
- [x] T012 [US1] Build `src/components/admin/reports-queue.tsx` (stats cards, filter chips, grouped queue cards incl. target-type badge and "N reports" count) — depends on T011
- [x] T013 [US1] Wire `reports-queue.tsx` into `src/app/admin/reports/page.tsx` — depends on T007, T012

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Moderator reviews a reported target and dismisses or removes it (Priority: P2)

**Goal**: A review drawer (representative reporter, reported content, cross-link, owner card) with Dismiss (generic) and Remove (delegating to `017`/`018` for postings/forum, direct for messages, unavailable for profiles).

**Independent Test**: Open a grouped report's drawer, confirm its content and the cross-source total-reports count; Dismiss one target and confirm every open report on it resolves untouched; Remove a posting-target and a message-target report and confirm each behaves correctly (quickstart.md Scenario 5-9).

### Tests for User Story 2

- [x] T014 [P] [US2] Integration test for `dismiss-report.ts` (resolves every open report on a target, any target type, without touching content) in `src/lib/actions/dismiss-report.test.ts`
- [x] T015 [P] [US2] Integration test for `resolve-report-action.ts`'s `remove` path (delegates into `017`'s/`018`'s actions for posting/forum, producing an identical effect; sets `messages.removedAt` for a message target; not offered/rejected for a profile target; role-gate rejection) in `src/lib/actions/resolve-report-action.test.ts`
- [x] T016 [P] [US2] Unit/integration test for `get-report-review.ts` (representative reporter/"+N others," reported content, cross-source `getTotalReportsForUser` aggregate) in `src/lib/admin/get-report-review.test.ts`
- [x] T017 [US2] Add the drawer/dismiss/remove scenario to `e2e/admin-reports.spec.ts` — depends on T010 (same file)

### Implementation for User Story 2

- [x] T018 [US2] Build `src/lib/admin/get-report-review.ts` (representative reporter, reported content, owner's join info/prior-warnings, cross-source total-reports aggregate — research.md #3) — depends on T002
- [x] T019 [US2] Build `src/lib/actions/dismiss-report.ts` (generic, any target type) — depends on T006
- [x] T020 [US2] Build `src/lib/actions/resolve-report-action.ts`'s `remove` path (delegates to `017`/`018` via `classify-forum-target.ts` for posting/forum; sets `messages.removedAt` directly for message; rejects for user/profile) — depends on T002, T004, T006
- [x] T021 [US2] Build `src/components/admin/report-review-drawer.tsx` (dialog/panel, focus trap, representative-reporter block, reported content, "Open in [module] moderation →" link, owner card, Dismiss/Remove buttons) — depends on T018, T019, T020
- [x] T022 [US2] Wire `report-review-drawer.tsx` into `src/app/admin/reports/page.tsx`, opened via each card's Review action — depends on T013, T021

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Moderator warns or bans the reported user (Priority: P3)

**Goal**: Warn (delegating where an owner exists, direct otherwise) and Ban (reuses `016`'s ban action, conditionally removes content).

**Independent Test**: Warn a reported user from a message-target report and confirm their combined prior-warnings count increases on Admin Users; ban a reported user from a profile-target report (account only) and from a posting-target report (account + content) and confirm each effect (quickstart.md Scenario 10).

### Tests for User Story 3

- [x] T023 [P] [US3] Integration test for `resolve-report-action.ts`'s `warn` path (delegates into `017`/`018` for posting/forum; writes a `warnings` row directly for message/profile with the correct `targetType`) — extends `src/lib/actions/resolve-report-action.test.ts` (same file as T015)
- [x] T024 [P] [US3] Integration test for `ban-reported-user.ts` (delegates to `016`'s `toggle-user-ban.ts`; conditionally removes content for posting/forum/message targets; account-only for profile targets; role-gate rejection) in `src/lib/actions/ban-reported-user.test.ts`
- [x] T025 [US3] Add the warn/ban scenario to `e2e/admin-reports.spec.ts` — depends on T017 (same file)

### Implementation for User Story 3

- [x] T026 [US3] Extend `resolve-report-action.ts` to support the `warn` path — depends on T020
- [x] T027 [US3] Build `src/lib/actions/ban-reported-user.ts` (calls `016`'s `toggle-user-ban.ts`; removes content via the same delegation as `remove` when the target isn't a profile) — depends on T020
- [x] T028 [US3] Wire Warn/Ban buttons into `report-review-drawer.tsx` — depends on T021, T026, T027

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Cross-Feature Amendment to Inbox (bounded — research.md #4)

**Purpose**: A small, single-purpose addition to `011`'s already-merged conversation view. Independent of Phases 3-5 (only needs T002 from Foundational).

- [x] T029 [P] Amend `src/app/inbox/[conversationId]/page.tsx` (`011-inbox-messaging`): add `AND removedAt IS NULL` to its inline messages query — depends on T002
- [x] T030 [P] Extend `011`'s conversation-view test to cover T029's new behavior — depends on T029

---

## Phase 7: Retroactive Amendments to Admin Postings/Admin Forum (bounded — research.md #5-#7)

**Purpose**: Small, single-purpose fixes to `017`'s and `018`'s already-merged files. Independent of Phases 3-6 (only needs T002/T004/T005 from Foundational).

- [x] T031 [P] Amend `src/lib/actions/resolve-posting-report.ts` (`017`): set `resolvedAt = now()` alongside its existing `status = 'resolved'` write — depends on T002
- [x] T032 [P] Amend `src/lib/actions/resolve-forum-report.ts` (`018`): same `resolvedAt` addition — depends on T002
- [x] T033 [P] Amend `src/lib/admin/get-forum-queue.ts` (`018`): import the shared `classify-forum-target.ts` instead of its own inline classification — depends on T004
- [x] T034 [P] Extend `017`'s `resolve-posting-report.test.ts`, `018`'s `resolve-forum-report.test.ts` and `get-forum-queue.test.ts`, and `018`'s `reason-severity.test.ts` to cover T031-T033 and T005's new behavior — depends on T031, T032, T033, T005

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T035 Confirm `next build` succeeds locally and CI stays green with the new gated route, four Server Actions (dismiss/remove/warn/ban, the latter three delegating across features), the extended schema, and all amended files
- [x] T036 Manually run quickstart.md Scenarios 1-12 end to end against local dev and confirm each passes
- [x] T037 [P] Update `docs/feature-list.md`, marking Admin Reports' spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T012 (drawer opens from the queue's Review action); T017 depends on US1's T010 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T020/T021 (extends the same resolution action and drawer); T025 depends on US2's T017 (same file).
- **Cross-Feature Amendment to `011` (Phase 6)**: Depends on Foundational (T002) only — independent of Phases 3-5.
- **Retroactive Amendments to `017`/`018` (Phase 7)**: Depends on Foundational (T002, T004, T005) only — independent of Phases 3-6.
- **Polish (Phase 8)**: Depends on all three user stories and Phases 6-7.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/admin-reports.spec.ts` (T010) accumulates scenarios across all three stories — same file, sequential.
- `src/app/admin/reports/page.tsx` (T007/T013) is extended by US2 (T022) — same file, sequential.
- `resolve-report-action.ts` (T020) is extended by US3 (T026) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005, T006) can run once T002/T003 land.
- Phase 6's amendment tasks (T029-T030) and Phase 7's amendment tasks (T031-T034) each touch different already-merged features' files, are independent of Phases 3-5 and of each other's phase, and can all run in parallel once their Foundational dependencies land.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-4, 11 independently
5. Moderators can see an accurate, filterable, grouped unified report
   queue — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready (incl. the extracted
   classification helper and the severity correction)
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (drawer + dismiss/remove,
   incl. delegation into `017`/`018`)
4. User Story 3 → validate independently (warn/ban)
5. Cross-Feature Amendments (Phases 6-7) → can be done any time after
   Foundational, validated via the extended existing test files
6. Polish → build/CI confirmation, quickstart run-through, doc update
