---

description: "Task list for Admin News implementation"
---

# Tasks: Admin News

**Input**: Design documents from `/specs/020-admin-news/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the save action's status/`publishedAt`/`featured` branching, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-role.ts` (`002`) exists in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema extensions, validation schemas, and gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Extend `newsPosts` (`013`) with `body` and `status` in `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/admin-news.ts` — Zod schemas for the save action (data-model.md)
- [ ] T005 Build `src/app/admin/news/page.tsx` shell, gated by `require-role.ts` (moderator minimum) — depends on T001

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Editor views and filters the post list (Priority: P1) 🎯 MVP

**Goal**: An accurate, filterable (All/Published/Drafts/Scheduled) post list that loads a selected post into the editor.

**Independent Test**: Confirm list/filter accuracy against seeded data across all three statuses; confirm access denial for a non-moderator (quickstart.md Scenario 1-2, 10).

### Tests for User Story 1

- [ ] T006 [P] [US1] Unit tests for `admin-news.ts`'s schemas in `src/lib/validations/admin-news.test.ts`
- [ ] T007 [P] [US1] Unit tests for `get-news-posts.ts` (list/filter logic) in `src/lib/admin/get-news-posts.test.ts`
- [ ] T008 [US1] Playwright e2e covering the list, filters, row-to-editor loading, and access-denial for a non-moderator, including an axe-core scan — creates `e2e/admin-news.spec.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Build `src/lib/admin/get-news-posts.ts` (research.md #6 for the list/filter pattern) — depends on T002, T004
- [ ] T010 [US1] Build `src/components/admin/news-post-list.tsx` (filter chips, rows with cover/status/date/pin indicator, "+ New") — depends on T009
- [ ] T011 [US1] Wire `news-post-list.tsx` into `src/app/admin/news/page.tsx` — depends on T005, T010

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Editor creates or edits a post and publishes, schedules, or saves a draft (Priority: P2)

**Goal**: A two-pane editor with a live preview and a save action that correctly branches into publish/schedule/update/save-draft.

**Independent Test**: Create, publish, schedule, and draft-save posts; confirm the live preview tracks field changes and each save path produces the right `status`/`publishedAt` (quickstart.md Scenario 3-7, 11).

### Tests for User Story 2

- [ ] T012 [P] [US2] Integration test for `save-news-post.ts` (publish sets `publishedAt`/status; schedule sets a future `publishedAt`/status; save-draft always overrides to `draft`; updating an already-published post preserves its original `publishedAt` — research.md #1, #5) in `src/lib/actions/save-news-post.test.ts`
- [ ] T013 [US2] Add the editor/publish/schedule/draft scenario to `e2e/admin-news.spec.ts` — depends on T008 (same file)

### Implementation for User Story 2

- [ ] T014 [US2] Build `src/lib/actions/save-news-post.ts` (create/update, branching by `action` per research.md #1) — depends on T004
- [ ] T015 [US2] Build `src/components/admin/news-post-editor.tsx` (cover swatches, title, category chips, excerpt, body textarea + markdown-snippet toolbar, publish-settings panel, live preview) — depends on T014
- [ ] T016 [US2] Wire `news-post-editor.tsx` into `src/app/admin/news/page.tsx`, loaded from list selection or "+ New" — depends on T011, T015

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Editor pins or unpublishes a post (Priority: P3)

**Goal**: An exclusive "pin to top" toggle and a Delete action that unpublishes (never hard-deletes) an existing post.

**Independent Test**: Pin a post and confirm exclusivity when pinning a different one; delete an existing post and confirm it becomes an editable draft, absent from the public feed (quickstart.md Scenario 8-9).

### Tests for User Story 3

- [ ] T017 [P] [US3] Integration test for `save-news-post.ts`'s pin-exclusivity transaction (setting `featured` on one row clears it on the previous one, atomically — research.md #2) — extends `src/lib/actions/save-news-post.test.ts` (same file as T012)
- [ ] T018 [P] [US3] Integration test for `save-news-post.ts`'s `delete` action (sets `status = 'draft'`, never removes the row) — same file as T012/T017
- [ ] T019 [US3] Add the pin/delete scenario to `e2e/admin-news.spec.ts` — depends on T013 (same file)

### Implementation for User Story 3

- [ ] T020 [US3] Extend `save-news-post.ts` with the pin-exclusivity transaction and the `delete` (unpublish) action — depends on T014
- [ ] T021 [US3] Wire the Pin toggle and Delete button into `news-post-editor.tsx` — depends on T015, T020

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Cross-Feature Amendment to News feed (bounded — research.md #3)

**Purpose**: A small, single-purpose addition to `013`'s already-merged public query. Independent of Phases 3-5 (only needs T002 from Foundational).

- [ ] T022 [P] Amend `src/lib/news/search-news.ts` (`013-news-feed`): include a post when `status = 'published'`, OR `status = 'scheduled'` AND its publish date/time has passed — depends on T002
- [ ] T023 [P] Extend `013`'s `search-news.test.ts` to cover T022's new behavior — depends on T022

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T024 Confirm `next build` succeeds locally and CI stays green with the new gated route, the save action, the extended schema, and the amended `013` query
- [ ] T025 Manually run quickstart.md Scenarios 1-11 end to end against local dev and confirm each passes
- [ ] T026 [P] Update `docs/feature-list.md`, marking Admin News' spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T010 (editor loads from the same list); T013 depends on US1's T008 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T014/T015 (extends the same save action and editor); T019 depends on US2's T013 (same file).
- **Cross-Feature Amendment (Phase 6)**: Depends on Foundational (T002) only — independent of Phases 3-5.
- **Polish (Phase 7)**: Depends on all three user stories and Phase 6.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/admin-news.spec.ts` (T008) accumulates scenarios across all three stories — same file, sequential.
- `src/app/admin/news/page.tsx` (T005/T011) is extended by US2 (T016) — same file, sequential.
- `save-news-post.ts` (T014) is extended by US3 (T020) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004) can run once T002/T003 land.
- Phase 6's amendment tasks (T022-T023) touch `013`'s already-merged files, are independent of Phases 3-5, and can run in parallel with any of them once T002 lands.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-2, 10 independently
5. Editors can see an accurate, filterable post list — the smallest
   useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (editor + publish/schedule/
   draft)
4. User Story 3 → validate independently (pin + delete-as-unpublish)
5. Cross-Feature Amendment (Phase 6) → can be done any time after
   Foundational, validated via the extended `013` test file
6. Polish → build/CI confirmation, quickstart run-through, doc update
