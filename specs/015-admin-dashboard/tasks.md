---

description: "Task list for Admin Dashboard implementation"
---

# Tasks: Admin Dashboard

**Input**: Design documents from `/specs/015-admin-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — no fetch-based API surface, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on every aggregate query plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-role.ts` (Error Pages, `002`) exists in the codebase, and add/extend a local seed script producing users/postings/reports/forum activity spread across today and the past week — needed to exercise the KPI/chart/needs-attention queries meaningfully

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new table and the gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add the `auditEntries` table to `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 Build `src/app/admin/page.tsx` shell, gated by `require-role.ts` (moderator minimum) — depends on T001

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Moderator views platform-wide KPIs and activity trends (Priority: P1) 🎯 MVP

**Goal**: Five accurate KPIs, a switchable 7-day activity chart, and a Top games ranking, all gated to moderator-or-higher.

**Independent Test**: Verify each KPI/chart value against a direct count; switch chart metrics; confirm Top games ranking; confirm access denial for a non-moderator (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T005 [P] [US1] Unit tests for `get-dashboard-kpis.ts` against seeded fixtures in `src/lib/admin/get-dashboard-kpis.test.ts`
- [ ] T006 [P] [US1] Unit tests for `get-activity-chart.ts` (7-day, per-metric) in `src/lib/admin/get-activity-chart.test.ts`
- [ ] T007 [P] [US1] Unit tests for `get-top-games.ts` in `src/lib/admin/get-top-games.test.ts`
- [ ] T008 [US1] Integration test confirming `require-role.ts` blocks a non-moderator session from `/admin`
- [ ] T009 [US1] Playwright e2e spec covering the KPIs, chart metric-switching, Top games, and access-denial for a non-moderator, including an axe-core scan — creates `e2e/admin-dashboard.spec.ts`

### Implementation for User Story 1

- [ ] T010 [P] [US1] Build `src/lib/admin/get-dashboard-kpis.ts` (research.md #1 for "Active today")
- [ ] T011 [P] [US1] Build `src/lib/admin/get-activity-chart.ts`
- [ ] T012 [P] [US1] Build `src/lib/admin/get-top-games.ts` (research.md #4)
- [ ] T013 [US1] Build `src/components/admin/kpi-card.tsx`, `src/components/admin/activity-chart.tsx` (including a non-visual data equivalent), and `src/components/admin/top-games.tsx` — depends on T010, T011, T012
- [ ] T014 [US1] Wire T013's components into `src/app/admin/page.tsx` — depends on T004, T013

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Moderator sees what needs attention and recent activity (Priority: P2)

**Goal**: Accurate Needs-attention counts by report type, and a recent-activity feed with a proper empty state.

**Independent Test**: Confirm Needs-attention counts against seeded reports; confirm the activity feed with and without seeded `AuditEntry` rows (quickstart.md Scenario 2).

### Tests for User Story 2

- [ ] T015 [P] [US2] Unit tests for `get-needs-attention.ts` in `src/lib/admin/get-needs-attention.test.ts`
- [ ] T016 [P] [US2] Integration test for `log-audit-entry.ts` (creates a row with the expected shape) in `src/lib/admin/log-audit-entry.test.ts`
- [ ] T017 [US2] Add the Needs-attention and recent-activity (including empty-state) scenario to `e2e/admin-dashboard.spec.ts` — depends on T009 (same file)

### Implementation for User Story 2

- [ ] T018 [P] [US2] Build `src/lib/admin/get-needs-attention.ts` (research.md #2) — depends on T002
- [ ] T019 [P] [US2] Build `src/lib/admin/log-audit-entry.ts` (FR-007; no callers wired up) — depends on T002
- [ ] T020 [US2] Build `src/components/admin/needs-attention.tsx` and `src/components/admin/recent-activity.tsx` (including the empty state) — depends on T018, T019
- [ ] T021 [US2] Wire T020's components into `src/app/admin/page.tsx` — depends on T014, T020

**Checkpoint**: Both user stories independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T022 Confirm `next build` succeeds locally and CI stays green with the new gated route and the new table
- [ ] T023 Manually run quickstart.md Scenarios 1-2 end to end against local dev and confirm each passes
- [ ] T024 [P] Update `docs/feature-list.md`, marking Admin Dashboard's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T014 (extends the same page); T017 depends on US1's T009 (same file).
- **Polish (Phase 5)**: Depends on both user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/admin-dashboard.spec.ts` (T009) accumulates scenarios across both stories — same file, sequential.
- `src/app/admin/page.tsx` (T004/T014) is extended by US2 (T021) — same file, sequential.

### Parallel Opportunities

- US1's three query modules (T010-T012) touch different files and can be built in parallel; same for US2's (T018-T019).
- US1's tests (T005-T007) can all run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Moderators can see real KPIs, the activity chart, and Top games —
   the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (needs-attention + activity)
4. Polish → build/CI confirmation, quickstart run-through, doc update
