---

description: "Task list for Moderator audit log implementation"
---

# Tasks: Moderator audit log

**Input**: Design documents from `/specs/025-moderator-audit-log/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — the CSV export is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the search/filter/day-grouping/export logic, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Confirm `src/lib/auth/require-role.ts` (`002`) and the `auditEntries` table/`logAuditEntry()` helper (`015`) exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Validation schemas and the gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Create `src/lib/validations/audit-log.ts` — Zod schemas for the `searchParams` boundary (data-model.md)
- [x] T003 Build `src/app/admin/audit-log/page.tsx` shell, gated by `require-role.ts` (moderator minimum — deliberately less strict than Admin Settings, `024`) — depends on T001

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Moderator browses, searches, and filters the audit log (Priority: P1) 🎯 MVP

**Goal**: An accurate, day-grouped, searchable/filterable view over `auditEntries`, with the real 4-value category badge.

**Independent Test**: Confirm search/actor/category filtering, day-grouping, and access control against seeded data (quickstart.md Scenario 1-5).

### Tests for User Story 1

- [x] T004 [P] [US1] Unit tests for `audit-log.ts`'s schemas in `src/lib/validations/audit-log.test.ts`
- [x] T005 [P] [US1] Unit tests for `get-audit-log.ts` (search/filter combination, day-grouping into Today/Yesterday/Earlier, category-badge accuracy) in `src/lib/admin/get-audit-log.test.ts`
- [x] T006 [US1] Playwright e2e covering browse, search, actor/category filters, day-grouping, the empty state, and access-denial for a non-moderator, including an axe-core scan — creates `e2e/audit-log.spec.ts`

### Implementation for User Story 1

- [x] T007 [US1] Build `src/lib/admin/get-audit-log.ts` (research.md #1 for the real-category badge, #4 for day-grouping, #6 for the search/filter/pagination pattern) — depends on T002
- [x] T008 [US1] Build `src/components/admin/audit-log-list.tsx` (search bar, actor/category filter controls, day-grouped rows) — depends on T007
- [x] T009 [US1] Wire `audit-log-list.tsx` into `src/app/admin/audit-log/page.tsx` — depends on T003, T008

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Moderator expands an entry for full detail and exports the current view (Priority: P2)

**Goal**: Real expand/collapse detail (reason + meta) and a CSV export that mirrors the active filter exactly.

**Independent Test**: Expand an entry and confirm its detail; export with an active filter and confirm the CSV matches it exactly (quickstart.md Scenario 6-7).

### Tests for User Story 2

- [x] T010 [P] [US2] Unit tests for `export-audit-log-csv.ts` (produces exactly the filtered result set — research.md #5) in `src/lib/admin/export-audit-log-csv.test.ts`
- [x] T011 [US2] Add the expand/collapse and CSV-export scenarios to `e2e/audit-log.spec.ts` — depends on T006 (same file)

### Implementation for User Story 2

- [x] T012 [US2] Build `src/lib/admin/export-audit-log-csv.ts` (reuses `get-audit-log.ts`'s same filter, unpaginated) — depends on T007
- [x] T013 [US2] Wire expand/collapse (`aria-expanded`, keyboard-operable) and the "Export CSV" button into `audit-log-list.tsx` — depends on T008, T012

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Every admin/moderation action across the whole suite appears here (Priority: P3)

**Goal**: Close the real `logAuditEntry()` gap in Admin News (`020`) and Admin Content Pages (`021`), so `content`-category entries actually exist to view.

**Independent Test**: Publish via Admin News and edit/create a page via Admin Content Pages; confirm both now produce a visible `content`-category entry here (quickstart.md Scenario 8-9).

### Tests for User Story 3

- [x] T014 [P] [US3] Integration test confirming `save-news-post.ts`'s (`020`) publish/schedule/update paths each call `logAuditEntry()` (`category = 'content'`) — extends `020`'s existing `save-news-post.test.ts`
- [x] T015 [P] [US3] Integration test confirming `create-content-page.ts`/`toggle-page-status.ts`/`delete-content-page.ts` (`021`) each call `logAuditEntry()` (`category = 'content'`) — extends `021`'s existing test files
- [x] T016 [US3] Add the gap-fix verification scenario (publish via `020`, edit/create via `021`, confirm both appear here) to `e2e/audit-log.spec.ts` — depends on T011 (same file)

### Implementation for User Story 3

- [x] T017 [US3] Amend `src/lib/actions/save-news-post.ts` (`020-admin-news`): add `logAuditEntry()` on publish/schedule/update (research.md #2) — depends on T001
- [x] T018 [US3] Amend `src/lib/actions/create-content-page.ts`, `toggle-page-status.ts`, and `delete-content-page.ts` (`021-admin-content-pages`): each add `logAuditEntry()` (research.md #2) — depends on T001

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T019 Confirm `next build` succeeds locally and CI stays green with the new gated route and the amended `020`/`021` files
- [x] T020 Manually run quickstart.md Scenarios 1-10 end to end against local dev and confirm each passes
- [x] T021 [P] Update `docs/feature-list.md`, marking Moderator audit log's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T007/T008 (reuses the same query and list component); T011 depends on US1's T006 (same file).
- **User Story 3 (Phase 5)**: Depends on Setup only (T001) — independent of Phases 3-4, since it only touches `020`'s/`021`'s already-merged files; T016 depends on US2's T011 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/audit-log.spec.ts` (T006) accumulates scenarios across all three stories — same file, sequential.
- `src/components/admin/audit-log-list.tsx` (T008) is extended by US2 (T013) — same file, sequential.

### Parallel Opportunities

- Foundational's [P] task (T002) can run alongside T003.
- User Story 3 (T017, T018) touches entirely different files than User Stories 1-2 and can be done in parallel with them once Setup (T001) is complete.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-5 independently
5. Moderators can browse, search, and filter the real audit trail —
   the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (expand/collapse + CSV
   export)
4. User Story 3 → validate independently (the `020`/`021` gap fix —
   can be done any time after Setup, in parallel with US1/US2)
5. Polish → build/CI confirmation, quickstart run-through, doc update
