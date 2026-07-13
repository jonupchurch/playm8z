---

description: "Task list for Forum index implementation"
---

# Tasks: Forum index

**Input**: Design documents from `/specs/009-forum-index/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — thread creation is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the validation/query logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Confirm `src/lib/auth/require-verified-email.ts` (Auth & Onboarding) exists in the codebase before starting — this feature's thread-creation Server Action depends on it directly

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new table, the category constant, the validation schemas, and the search query every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add the `forumThreads` table to `src/db/schema.ts` (data-model.md)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 [P] Create `src/lib/forum/categories.ts` — the six hardcoded category keys/labels/dot colors (research.md #1)
- [x] T005 [P] Create `src/lib/validations/forum.ts` — Zod schemas for `searchParams` and thread creation (data-model.md)
- [x] T006 Create `src/lib/forum/search-threads.ts` — validates `searchParams` via T005, builds the query (category + search + sort, pinned-always-first, the HOT heuristic) — depends on T002, T004, T005

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Any visitor browses, searches, and filters threads (Priority: P1) 🎯 MVP

**Goal**: Category filter, search, sort, pinned-first ordering, accurate stats/trending tags, and an empty state all work for any visitor.

**Independent Test**: Select a category, search, change sort, confirm pinned-first holds, confirm the right rail and empty state (quickstart.md Scenario 1).

### Tests for User Story 1

- [x] T007 [P] [US1] Unit tests for `forum.ts`'s schemas in `src/lib/validations/forum.test.ts`
- [x] T008 [P] [US1] Unit tests for `search-threads.ts`'s category/search/sort combination logic, pinned-first ordering, and the HOT heuristic in `src/lib/forum/search-threads.test.ts`
- [x] T009 [P] [US1] Integration test for `search-threads.ts` against real seeded rows in Postgres — same file as T008
- [x] T010 [US1] Playwright e2e spec covering browse/search/filter/sort and the empty state, including an axe-core scan — creates `e2e/forum-index.spec.ts`

### Implementation for User Story 1

- [x] T011 [US1] Build `src/lib/forum/get-forum-stats.ts` — member/thread counts and trending tags — depends on T002
- [x] T012 [US1] Build `src/components/forum/thread-row.tsx` — depends on T004
- [x] T013 [US1] Build `src/components/forum/right-rail.tsx` — depends on T011
- [x] T014 [US1] Build `src/app/forum/page.tsx`: await/validate `searchParams`, run `search-threads.ts`, render category chips, the thread list (`thread-row.tsx`), `right-rail.tsx`, and the empty state — depends on T006, T012, T013

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Verified user creates a new thread (Priority: P2)

**Goal**: A verified user creates a thread via a modal; it appears immediately; logged-out/unverified attempts are blocked appropriately.

**Independent Test**: Create a thread and confirm it appears immediately; confirm logged-out redirect and unverified-block (quickstart.md Scenario 2).

### Tests for User Story 2

- [x] T015 [P] [US2] Integration test for `create-thread.ts` (creates a thread with default `pinned`/`locked`/counts; blocked for an unverified session) in `src/lib/actions/create-thread.test.ts`
- [x] T016 [US2] Add the New Thread scenario (create, appears immediately, logged-out redirect, unverified block) to `e2e/forum-index.spec.ts`, including an axe-core scan of the modal — depends on T010 (same file)

### Implementation for User Story 2

- [x] T017 [US2] Build `create-thread.ts` in `src/lib/actions/create-thread.ts` — depends on T005
- [x] T018 [US2] Build `src/components/forum/new-thread-modal.tsx` — following Blocked Users' dialog pattern (research.md #4) — depends on T017
- [x] T019 [US2] Wire the "New thread" entry point into `src/app/forum/page.tsx` — depends on T014, T018

**Checkpoint**: Both user stories independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T020 Confirm `next build` succeeds locally and CI stays green with the new route, Server Action, and new table
- [x] T021 Manually run quickstart.md Scenarios 1-2 end to end against local dev and confirm each passes
- [x] T022 [P] Update `docs/feature-list.md`, marking Forum index's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T014 (extends the same page); T016 depends on US1's T010 (same file).
- **Polish (Phase 5)**: Depends on both user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/forum-index.spec.ts` (T010) accumulates scenarios across both stories — same file, sequential.
- `src/app/forum/page.tsx` (T014) is extended by US2 (T019) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005) can run once T002/T003 land.
- US1's tests (T007-T009) can mostly run in parallel; `thread-row.tsx` and `right-rail.tsx` (T012, T013) touch different files and can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Anyone can browse/search/filter/sort the forum — the smallest useful
   slice (assumes seeded thread data)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (thread creation)
4. Polish → build/CI confirmation, quickstart run-through, doc update
