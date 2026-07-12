---

description: "Task list for Content Page implementation"
---

# Tasks: Content Page

**Input**: Design documents from `/specs/014-content-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the block schema plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-role.ts` (Error Pages, `002`) exists in the codebase, and add a small local seed script inserting one sample `contentPages` row covering every block type — needed since Admin Content Pages doesn't exist yet to create one through the UI

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new table, the block validation schema, and the page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add the `contentPages` table to `src/db/schema.ts`, with `blocks` as a JSONB column (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/content-page.ts` — the block discriminated-union Zod schema (data-model.md)
- [ ] T005 Build `src/app/pages/[slug]/page.tsx` shell: fetch by slug, call `notFound()` for a missing slug or a draft one viewed by a non-moderator (research.md #4) — depends on T002, T004

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Any visitor reads a published content page (Priority: P1) 🎯 MVP

**Goal**: Every block type renders correctly for any visitor; missing/draft slugs 404 for non-admins.

**Independent Test**: Read a published page (all block types), confirm 404 for a missing or draft slug (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T006 [P] [US1] Unit tests for `content-page.ts`'s block schema (all six types) in `src/lib/validations/content-page.test.ts`
- [ ] T007 [US1] Playwright e2e spec covering public read of every block type and the 404 behavior for missing/draft slugs, including an axe-core scan — creates `e2e/content-page.spec.ts`

### Implementation for User Story 1

- [ ] T008 [US1] Build `src/components/content-page/block-renderer.tsx` — view-mode rendering for all six block types — depends on T004
- [ ] T009 [US1] Wire `block-renderer.tsx` into `src/app/pages/[slug]/page.tsx` — depends on T005, T008

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Moderator/admin edits a page's content inline (Priority: P2)

**Goal**: Local-state batched editing (add/reorder/delete/edit), with Save persisting atomically and Cancel discarding cleanly.

**Independent Test**: Enter edit mode, make several kinds of changes, save, confirm on reload; repeat and cancel, confirm nothing changed (quickstart.md Scenario 2).

### Tests for User Story 2

- [ ] T010 [P] [US2] Integration test for `save-content-page.ts` (persists title+blocks atomically; rejects a non-moderator session) in `src/lib/actions/save-content-page.test.ts`
- [ ] T011 [US2] Add the edit-mode scenario (add/reorder/delete/edit, save, cancel) to `e2e/content-page.spec.ts`, including an axe-core scan of edit mode — depends on T007 (same file)

### Implementation for User Story 2

- [ ] T012 [US2] Build `save-content-page.ts` in `src/lib/actions/save-content-page.ts` — depends on T004
- [ ] T013 [US2] Build `src/components/content-page/page-editor.tsx`: local draft state, add/reorder/delete/edit, Save/Cancel (research.md #3) — depends on T012
- [ ] T014 [US2] Wire `page-editor.tsx` into `src/app/pages/[slug]/page.tsx` for moderator-or-higher viewers — depends on T009, T013

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Moderator/admin publishes or unpublishes a page (Priority: P3)

**Goal**: A moderator-or-higher user can toggle published/draft; the change takes effect immediately for other visitors.

**Independent Test**: Unpublish a page, confirm it 404s for a logged-out visitor; publish it again, confirm visibility returns (quickstart.md Scenario 3).

### Tests for User Story 3

- [ ] T015 [US3] Integration test for `toggle-page-status.ts` (published ⇄ draft; rejects a non-moderator session) in `src/lib/actions/toggle-page-status.test.ts`
- [ ] T016 [US3] Add the publish/unpublish scenario to `e2e/content-page.spec.ts` — depends on T011 (same file)

### Implementation for User Story 3

- [ ] T017 [US3] Build `toggle-page-status.ts` in `src/lib/actions/toggle-page-status.ts` — depends on T004
- [ ] T018 [US3] Wire a Publish/Unpublish control into `page-editor.tsx`'s edit bar — depends on T014, T017

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T019 Confirm `next build` succeeds locally and CI stays green with the new dynamic route, two Server Actions, and the new table
- [ ] T020 Manually run quickstart.md Scenarios 1-3 end to end against local dev and confirm each passes
- [ ] T021 [P] Update `docs/feature-list.md`, marking Content Page's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T009 (extends the same page); T011 depends on US1's T007 (same file).
- **User Story 3 (Phase 5)**: Depends on US2's T014 (extends the same editor); T016 depends on US2's T011 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/content-page.spec.ts` (T007) accumulates scenarios across all three stories — same file, sequential.
- `src/app/pages/[slug]/page.tsx` (T005/T009) is extended by US2 (T014) — same file, sequential.

### Parallel Opportunities

- T004 and T005 can proceed once T002/T003 land; T004 has no further internal dependency.
- US1's block-renderer (T008) and US2's Server Action (T012) touch different files and could be built in parallel once Foundational is done.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Anyone can read a published content page — the smallest useful
   slice (assumes a seeded page)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (inline editing)
4. User Story 3 → validate independently (publish/unpublish)
5. Polish → build/CI confirmation, quickstart run-through, doc update
