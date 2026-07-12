---

description: "Task list for News feed implementation"
---

# Tasks: News feed

**Input**: Design documents from `/specs/013-news-feed/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — the one write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the validation/query logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Add a small local seed script (e.g. `scripts/seed-news-posts.ts`) inserting sample `newsPosts` rows (including exactly one `featured` and one `upcoming` Event post) — needed because Admin News doesn't exist yet to create them through the UI

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new tables, validation schemas, and the featured/filter/pagination query every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add the `newsPosts` and `newsletterSubscribers` tables to `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/news.ts` — Zod schemas for `searchParams` and the subscribe email (data-model.md)
- [ ] T005 Create `src/lib/news/search-news.ts` — validated `searchParams` → featured post + paginated, filtered/searched grid — depends on T002

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Any visitor browses, searches, and filters news posts (Priority: P1) 🎯 MVP

**Goal**: Featured post shows only with no filter/search; category/search combine; "Load more" paginates; empty state for no matches.

**Independent Test**: Confirm the featured-post visibility rule, filter/search combination, pagination, and empty state (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T006 [P] [US1] Unit tests for `news.ts`'s schemas in `src/lib/validations/news.test.ts`
- [ ] T007 [P] [US1] Unit tests for `search-news.ts`'s featured-exclusion, filter/search AND-combination, and pagination logic in `src/lib/news/search-news.test.ts`
- [ ] T008 [US1] Playwright e2e spec covering browse, filter, search, "Load more," and the empty state, including an axe-core scan — creates `e2e/news-feed.spec.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Build `src/components/news/news-post-card.tsx` — depends on T004
- [ ] T010 [US1] Build `src/components/news/featured-post.tsx` — depends on T004
- [ ] T011 [US1] Build `src/app/news/page.tsx`: fetch via `search-news.ts`, render the featured post, grid, "Load more," and empty state — depends on T005, T009, T010

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Any visitor subscribes to the newsletter (Priority: P2)

**Goal**: Submit a valid email with no login required; malformed/duplicate emails are rejected.

**Independent Test**: Subscribe with a valid email, confirm the record; attempt malformed and duplicate submissions (quickstart.md Scenario 2).

### Tests for User Story 2

- [ ] T012 [P] [US2] Integration test for `subscribe-newsletter.ts` (creates a subscriber; rejects a malformed email; rejects a duplicate at the database level) in `src/lib/actions/subscribe-newsletter.test.ts`
- [ ] T013 [US2] Add the subscribe scenario to `e2e/news-feed.spec.ts` — depends on T008 (same file)

### Implementation for User Story 2

- [ ] T014 [US2] Build `subscribe-newsletter.ts` in `src/lib/actions/subscribe-newsletter.ts` — no session check (research.md #3) — depends on T004
- [ ] T015 [US2] Build `src/components/news/subscribe-strip.tsx` — depends on T014
- [ ] T016 [US2] Wire `subscribe-strip.tsx` into `src/app/news/page.tsx` — depends on T011, T015

**Checkpoint**: Both user stories independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T017 Confirm `next build` succeeds locally and CI stays green with the new route, one Server Action, and two new tables
- [ ] T018 Manually run quickstart.md Scenarios 1-2 end to end against local dev and confirm each passes
- [ ] T019 [P] Update `docs/feature-list.md`, marking News feed's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T011 (extends the same page); T013 depends on US1's T008 (same file).
- **Polish (Phase 5)**: Depends on both user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/news-feed.spec.ts` (T008) accumulates scenarios across both stories — same file, sequential.
- `src/app/news/page.tsx` (T011) is extended by US2 (T016) — same file, sequential.

### Parallel Opportunities

- US1's tests (T006-T007) can run in parallel; `news-post-card.tsx` and `featured-post.tsx` (T009, T010) touch different files and can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Anyone can browse/search/filter/paginate news posts — the smallest
   useful slice (assumes seeded post data)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (newsletter subscribe)
4. Polish → build/CI confirmation, quickstart run-through, doc update
