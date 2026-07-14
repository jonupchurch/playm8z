---

description: "Task list for Notifications + Report modal implementation"
---

# Tasks: Notifications + Report modal

**Input**: Design documents from `/specs/012-notifications-and-report-modal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the validation/filter logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [X] T001 Confirm `src/lib/auth/require-verified-email.ts`, Inbox's `accept-request.ts`/`decline-request.ts` (`011`), and Blocked Users' `reports`/`blocks` tables (`008`) all exist in the codebase before starting — all are direct dependencies of this feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new table, validation schemas, the notification-creation helper, and the filtered/grouped read query every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add the `notifications` table to `src/db/schema.ts` (data-model.md)
- [X] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [X] T004 [P] Create `src/lib/validations/notifications.ts` — Zod schemas for report reason/details/target and mark-read input (data-model.md)
- [X] T005 [P] Create `src/lib/notifications/create-notification.ts` — the reusable helper (research.md #1; no callers wired up by this feature)
- [X] T006 Create `src/lib/notifications/get-notifications.ts` — filtered (All/Unread/Requests/Forum/System) and Today/Earlier-grouped read — depends on T002

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - User views, filters, and clears their notifications (Priority: P1) 🎯 MVP

**Goal**: Bell dropdown with accurate unread count/preview; full page with filters, grouping, mark-read/mark-all-read, and an empty state.

**Independent Test**: Check the bell dropdown, filter the full page each way, mark one and then all as read (quickstart.md Scenario 1).

### Tests for User Story 1

- [X] T007 [P] [US1] Unit tests for `notifications.ts`'s schemas in `src/lib/validations/notifications.test.ts`
- [X] T008 [P] [US1] Unit tests for `get-notifications.ts`'s filter/grouping logic in `src/lib/notifications/get-notifications.test.ts`
- [X] T009 [P] [US1] Integration test for `mark-notification-read.ts` and `mark-all-read.ts` in `src/lib/actions/mark-notification-read.test.ts`
- [X] T010 [US1] Playwright e2e spec covering the bell dropdown, full-page filters, mark-read/mark-all-read, and the empty state, including an axe-core scan — creates `e2e/notifications.spec.ts`

### Implementation for User Story 1

- [X] T011 [US1] Build `mark-notification-read.ts` in `src/lib/actions/mark-notification-read.ts` — depends on T004
- [X] T012 [US1] Build `mark-all-read.ts` in `src/lib/actions/mark-all-read.ts` — depends on T004
- [X] T013 [US1] Build `src/components/nav/notification-bell.tsx` — a real disclosure widget (`aria-expanded`/`aria-haspopup`) — depends on T006
- [X] T014 [US1] Build `src/app/notifications/page.tsx`: filters, Today/Earlier grouping, mark-read/mark-all-read, empty state — depends on T006, T011, T012
- [X] T015 [US1] Wire `notification-bell.tsx` into the shared nav shell's existing slot — depends on T013

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - User accepts or declines a pending join request from a notification (Priority: P2)

**Goal**: Accept/Decline on a request notification produce exactly the same result as Inbox's own controls, via the same Server Actions.

**Independent Test**: Accept and decline separate pending requests directly from notifications, confirming parity with Inbox (quickstart.md Scenario 2).

### Tests for User Story 2

- [X] T016 [US2] Add the accept/decline-from-notification scenario to `e2e/notifications.spec.ts`, confirming identical results to Inbox's own flow — depends on T010 (same file)

### Implementation for User Story 2

- [X] T017 [US2] Wire Accept/Decline controls on request-type notification rows directly to Inbox's existing `accept-request.ts`/`decline-request.ts` (research.md #2) — depends on T014

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - User reports content via the canonical report flow (Priority: P3)

**Goal**: A reusable 3-step report modal creates a real-reason `reports` row and, optionally, a `blocks` row.

**Independent Test**: Submit a report with and without "Also block," confirming the resulting records (quickstart.md Scenario 3).

### Tests for User Story 3

- [X] T018 [P] [US3] Integration test for `submit-report.ts` (creates a `reports` row with a real reason; the optional `blocks` row; blocked for an unverified session) in `src/lib/actions/submit-report.test.ts`
- [X] T019 [US3] Add the report-flow scenario (with/without "Also block," gate-blocked) to `e2e/notifications.spec.ts`, including an axe-core scan of the report modal — depends on T016 (same file)

### Implementation for User Story 3

- [X] T020 [US3] Build `submit-report.ts` in `src/lib/actions/submit-report.ts` — depends on T004
- [X] T021 [US3] Build `src/components/reports/report-modal.tsx` — the 3-step flow, following the established dialog pattern — depends on T020
- [X] T022 [US3] Wire `report-modal.tsx` into Listing detail's newly-un-deferred Report action (`006-listing-detail`'s amended FR-019/T030) — depends on T021

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 Confirm `next build` succeeds locally and CI stays green with the new route, the nav-slot addition, the new table, and the reused `reports`/`blocks` writes
- [X] T024 Manually run quickstart.md Scenarios 1-3 end to end against local dev and confirm each passes
- [X] T025 [P] Update `docs/feature-list.md`, marking Notifications + Report modal's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T014 (extends the same page); T016 depends on US1's T010 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational; T019 depends on US2's T016 (same file); T022 depends on Listing detail's own T030 existing.
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/notifications.spec.ts` (T010) accumulates scenarios across all three stories — same file, sequential.
- `src/app/notifications/page.tsx` (T014) is extended by US2 (T017) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005) can run once T002/T003 land.
- US1's tests (T007-T009) can mostly run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. A user can view, filter, and clear notifications — the smallest
   useful slice (assumes seeded notification data)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (accept/decline parity)
4. User Story 3 → validate independently (report flow)
5. Polish → build/CI confirmation, quickstart run-through, doc update
