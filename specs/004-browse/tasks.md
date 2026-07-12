---

description: "Task list for Browse implementation"
---

# Tasks: Browse

**Input**: Design documents from `/specs/004-browse/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — no fetch-based API surface, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the validation/query-builder logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Extend `003-home`'s `scripts/seed-postings.ts` with this feature's new columns (`genre`, `ageGroup`, `timeSlots`, `platform`, `micRequired`, `scheduledDate`) so seeded data exercises every facet

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The extended table, the validated facet schema, the shared listing-card component, and the faceted query every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Extend the `postings` table in `src/db/schema.ts` with `genre`, `ageGroup`, `timeSlots`, `platform`, `micRequired`, `scheduledDate` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/browse-filters.ts` — the Zod schema validating every `searchParams` facet value before use (data-model.md)
- [ ] T005 [P] Relocate `src/components/home/listing-card.tsx` to `src/components/listings/listing-card.tsx`, extending it with the genre eyebrow and time-slot tag Browse's data includes (research.md #3) — update Home's existing usage to the new path
- [ ] T006 Create `src/lib/postings/search-postings.ts` — validates `searchParams` via T004, then builds and runs the faceted Drizzle query (AND across facets, OR within a multi-select facet) — depends on T002, T004

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Visitor searches and filters to find a matching open party (Priority: P1) 🎯 MVP

**Goal**: Keyword search plus every facet combine correctly, results sort, live counts show, and selecting a result navigates away.

**Independent Test**: Apply a facet combination, confirm AND-across/OR-within semantics hold, confirm live counts, and confirm card click-through (quickstart.md Scenarios 1, 2, 4, 5, 7).

### Tests for User Story 1

- [ ] T007 [P] [US1] Unit tests for `browse-filters.ts` (enum membership, array bounds, defaults) in `src/lib/validations/browse-filters.test.ts`
- [ ] T008 [P] [US1] Unit tests for `search-postings.ts`'s facet-combination logic (AND across facets, OR within a multi-select facet) in `src/lib/postings/search-postings.test.ts`
- [ ] T009 [P] [US1] Integration test for `search-postings.ts` against real seeded rows in Postgres, including the "Soonest" sort's null-scheduledDate ordering, in `src/lib/postings/search-postings.test.ts`
- [ ] T010 [US1] Playwright e2e spec covering keyword+facet combination, sort, live facet counts, and card click-through, including an axe-core scan — creates `e2e/browse.spec.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Build `src/lib/postings/get-facet-counts.ts` — live Game/Region option counts over currently-open postings (research.md #5) — depends on T002
- [ ] T012 [US1] Build `src/components/browse/filter-sidebar.tsx`: real radio-group semantics for Vibe/Age group/Open slots/Platform, real checkbox semantics for Game/Region (with T011's live counts), multi-select chips for Genre/Time slots, the Mic-required toggle, and a debounced keyword field — every control updates the URL's `searchParams` — depends on T004, T011
- [ ] T013 [US1] Build `src/app/browse/page.tsx`: await and validate `searchParams`, run `search-postings.ts` (T006), render `filter-sidebar.tsx`, the results grid using the relocated `listing-card.tsx` (T005), the sort control, and an `aria-live` result count — depends on T005, T006, T012

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Visitor manages active filters via pills (Priority: P2)

**Goal**: Every active facet shows as an individually removable pill; "Clear all" resets everything.

**Independent Test**: Apply several facets, remove one pill and confirm only it clears, then "Clear all" and confirm every facet resets (quickstart.md Scenario 3).

### Tests for User Story 2

- [ ] T014 [US2] Add the pills scenario (each active facet gets a removable pill; removing one leaves the others active; "Clear all" resets everything) to `e2e/browse.spec.ts` — depends on T010 (same file)

### Implementation for User Story 2

- [ ] T015 [US2] Build `src/components/browse/active-pills.tsx`: derives a pill per active facet value from the current `searchParams`, each independently removable, plus a "Clear all" action — depends on T004
- [ ] T016 [US2] Wire `active-pills.tsx` into `src/app/browse/page.tsx` — depends on T013, T015

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - No postings match, and there's a clear next step (Priority: P3)

**Goal**: A zero-match combination shows guidance with "Clear filters" and "Post a game" instead of a blank grid.

**Independent Test**: Combine facets to match nothing seeded, confirm the empty state and both its actions (quickstart.md Scenario 6).

### Tests for User Story 3

- [ ] T017 [US3] Add the empty-state scenario (no matches → guidance, "Clear filters," "Post a game") to `e2e/browse.spec.ts` — depends on T014 (same file)

### Implementation for User Story 3

- [ ] T018 [US3] Build `src/components/browse/browse-empty-state.tsx`: guidance copy, a "Clear filters" action reusing T015's clear-all behavior, and a "Post a game" action toward the future Post a Game route — depends on T015
- [ ] T019 [US3] Wire `browse-empty-state.tsx` into `src/app/browse/page.tsx` for the zero-results case — depends on T013, T018

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T020 Confirm `next build` succeeds locally and CI stays green with the new `/browse` route and the extended `postings` schema
- [ ] T021 Manually run quickstart.md Scenarios 1-7 end to end against local dev and confirm each passes
- [ ] T022 [P] Update `docs/feature-list.md`, marking Browse's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; T014 depends on US1's T010 (same file); T016 depends on US1's T013 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T015 (reused clear-all behavior); T017 depends on US2's T014 (same file); T019 depends on US1's T013 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/browse.spec.ts` (T010) accumulates scenarios across all three stories — same file, so those additions are sequential relative to each other.
- `src/app/browse/page.tsx` (T013) is wired into by both US2 (T016) and US3 (T019) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005) can run once T002/T003 land.
- US1's tests (T007-T009) can all run in parallel.
- `get-facet-counts.ts` (T011) and `browse-filters.ts` (T004) touch different files and can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1, 2, 4, 5, 7 independently
5. Full faceted search/filter/sort/click-through all work — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (pills + Clear all)
4. User Story 3 → validate independently (empty state)
5. Polish → build/CI confirmation, quickstart run-through, doc update
