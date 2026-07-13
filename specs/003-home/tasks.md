---

description: "Task list for Home implementation"
---

# Tasks: Home

**Input**: Design documents from `/specs/003-home/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — no fetch-based API surface, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the query/filter logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Add a small local seed script (e.g. `scripts/seed-postings.ts`) that inserts a handful of sample open `postings` rows — needed because Post a Game doesn't exist yet to create them through the UI (quickstart.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared table, the open-postings read, and the page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add the `postings` table to `src/db/schema.ts` (data-model.md's minimal shape: `hostId`, `game`, `title`, `blurb`, `vibe`, `region`, `seatsTotal`, `seatsOpen`, `status`, `createdAt`)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 [P] Create `src/lib/postings/get-open-postings.ts` — reads rows where `status = open` — depends on T002
- [x] T005 Modify `src/app/page.tsx`: redirect an unauthenticated visitor to `/login` (research.md #3), otherwise fetch open postings via T004 and render the Home page shell — depends on T004

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Visitor finds and opens a matching open listing (Priority: P1) 🎯 MVP

**Goal**: Search, Vibe/Region filters, and sort narrow the feed live; selecting a card navigates to Listing detail.

**Independent Test**: Type a search term or pick a filter chip, confirm the feed narrows live, and confirm selecting a card navigates away (quickstart.md Scenarios 1-4).

### Tests for User Story 1

- [x] T006 [P] [US1] Unit test for `listing-card.tsx`'s rendering (host, avatar, post age, region, game, title, blurb, vibe tag, seat count, open indicator) in `src/components/home/listing-card.test.tsx`
- [x] T007 [P] [US1] Unit test for `live-feed.tsx`'s client-side filter/sort logic (search match, Vibe+Region AND-combination, sort order) in `src/components/home/live-feed.test.tsx`
- [x] T008 [P] [US1] Integration test for `get-open-postings.ts` against real seeded rows in Postgres (only `open` status returned) in `src/lib/postings/get-open-postings.test.ts`
- [x] T009 [US1] Playwright e2e spec covering search, Vibe/Region filter combination, sort, and card click-through, including an axe-core scan — creates `e2e/home.spec.ts`

### Implementation for User Story 1

- [x] T010 [US1] Build `src/components/home/listing-card.tsx` — depends on T002
- [x] T011 [US1] Build `src/components/home/live-feed.tsx`: search bar, Vibe chip, Region chip, sort control, AND-combined filtering, an `aria-live` result-count region, renders `listing-card.tsx` for matches — depends on T010
- [x] T012 [US1] Wire `live-feed.tsx` into `src/app/page.tsx`, passing the fetched open postings — depends on T005, T011

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Visitor discovers what's trending and jumps to it (Priority: P2)

**Goal**: The Trending row shows the top games by current open-posting count; selecting one narrows the feed on-page.

**Independent Test**: Confirm the Trending row's counts match seeded data, select a game, and confirm the feed narrows without navigating away (quickstart.md Scenario 5).

### Tests for User Story 2

- [x] T013 [P] [US2] Unit test for `get-trending.ts`'s aggregate logic (grouping, count, descending order, top-5 cap, fewer-than-5 case) in `src/lib/postings/get-trending.test.ts`
- [x] T014 [US2] Add the Trending scenario (row renders counts; selecting a game narrows the feed in place) to `e2e/home.spec.ts` — depends on T009 (same file)

### Implementation for User Story 2

- [x] T015 [US2] Create `src/lib/postings/get-trending.ts` — depends on T002
- [x] T016 [US2] Build `src/components/home/trending-row.tsx` — depends on T015
- [x] T017 [US2] Wire `trending-row.tsx`'s selection into `live-feed.tsx`'s search state (research.md #1) and into `src/app/page.tsx`'s fetch — depends on T011, T016

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - No listings match, and there's a clear next step (Priority: P3)

**Goal**: A zero-match search/filter combination shows guidance and a working "Post this game" path instead of a blank grid.

**Independent Test**: Search for something that matches nothing seeded, confirm the empty state and its CTA (quickstart.md Scenario 6).

### Tests for User Story 3

- [x] T018 [P] [US3] Unit test for `empty-state.tsx`'s rendering (guidance copy, "Post this game" action carrying the current search term) in `src/components/home/empty-state.test.tsx`
- [x] T019 [US3] Add the empty-state scenario (no matches → guidance + working CTA) to `e2e/home.spec.ts` — depends on T014 (same file)

### Implementation for User Story 3

- [x] T020 [US3] Build `src/components/home/empty-state.tsx`, linking "Post this game" toward the future Post a Game route with the current search term carried over where practical
- [x] T021 [US3] Wire `empty-state.tsx` into `live-feed.tsx` for the zero-results case — depends on T011, T020

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T022 Confirm `next build` succeeds locally and CI stays green after replacing the default scaffold page with Home's real content
- [x] T023 Manually run quickstart.md Scenarios 1-7 end to end against local dev and confirm each passes
- [x] T024 [P] Update `docs/feature-list.md`, marking Home's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; T014 depends on US1's T009 (same file); T017 depends on US1's T011 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational; T019 depends on US2's T014 (same file); T021 depends on US1's T011 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `live-feed.tsx` (T011) accumulates functionality across all three stories (search/filter/sort in US1, trending wiring in US2, empty-state wiring in US3) — same file, so those wiring tasks are sequential relative to each other.
- `e2e/home.spec.ts` (T009) is shared across all three stories the same way — sequential for the same reason.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004) can run once T002/T003 land.
- US1's tests (T006-T008) can all run in parallel.
- US2's test (T013) and US3's test (T018) can run in parallel with each other and with US1's work, since none share a file with US1's tests.
- `get-trending.ts` (T015) and `empty-state.tsx` (T020) touch different files and can be built in parallel once Foundational is done.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-4 independently
5. Search, filter, sort, and click-through all work — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (Trending)
4. User Story 3 → validate independently (empty state)
5. Polish → build/CI confirmation, quickstart run-through, doc update
