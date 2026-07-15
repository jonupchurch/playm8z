---

description: "Task list for Admin Content Pages implementation"
---

# Tasks: Admin Content Pages

**Input**: Design documents from `/specs/021-admin-content-pages/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the search/filter and unique-slug logic, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Confirm `src/lib/auth/require-role.ts` (`002`) and `src/lib/actions/toggle-page-status.ts` (`014`) exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema extension, the system-page seed, validation schemas, and the gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add `contentPages.system` (boolean, default `false`) in `src/db/schema.ts` (data-model.md)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 Seed the three system pages (About Us, Privacy Policy, Terms of Use — `system = true`, `status = published`, minimal placeholder content) per data-model.md's Seed data table — depends on T002, T003
- [x] T005 [P] Create `src/lib/validations/admin-content-pages.ts` — Zod schemas for search/filter and delete (data-model.md)
- [x] T006 Build `src/app/admin/content-pages/page.tsx` shell, gated by `require-role.ts` (moderator minimum) — depends on T001

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Moderator views, searches, and filters the page list (Priority: P1) 🎯 MVP

**Goal**: Accurate stats and a searchable/filterable table of every `ContentPage`, including the three system pages.

**Independent Test**: Confirm stats/search/filter accuracy against seeded data (including system pages); confirm access denial for a non-moderator (quickstart.md Scenario 1-2, 8).

### Tests for User Story 1

- [x] T007 [P] [US1] Unit tests for `admin-content-pages.ts`'s schemas in `src/lib/validations/admin-content-pages.test.ts`
- [x] T008 [P] [US1] Unit tests for `search-content-pages.ts` (search/filter combination) in `src/lib/admin/search-content-pages.test.ts`
- [x] T009 [US1] Playwright e2e covering stats, search, filters, and access-denial for a non-moderator, including an axe-core scan — creates `e2e/admin-content-pages.spec.ts`

### Implementation for User Story 1

- [x] T010 [US1] Build `src/lib/admin/search-content-pages.ts` (research.md #5 for the fetch-all-then-filter pattern) — depends on T002, T004, T005
- [x] T011 [US1] Build `src/components/admin/content-page-table.tsx` (stats cards, search input, filter chips, rows incl. system badge) — depends on T010
- [x] T012 [US1] Wire `content-page-table.tsx` into `src/app/admin/content-pages/page.tsx` — depends on T006, T011

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Moderator publishes, unpublishes, or creates a page (Priority: P2)

**Goal**: Publish/Unpublish (reusing `014`'s toggle), View/Edit navigation to `014`'s own page, and "+ New page" creation with a unique auto-generated slug.

**Independent Test**: Toggle a page's status and confirm it reuses `014`'s existing action; create a new page and confirm its unique slug; confirm View/Edit navigate to the right place (quickstart.md Scenario 3-5).

### Tests for User Story 2

- [x] T013 [P] [US2] Unit tests for `create-content-page.ts`'s unique-slug generation, including the collision/suffix case (research.md #4) in `src/lib/actions/create-content-page.test.ts`
- [x] T014 [P] [US2] Integration test for `create-content-page.ts` (creates a draft "Untitled page" row with `system = false`; role-gate rejection) — same file as T013
- [x] T015 [US2] Add the publish/unpublish, create, and view/edit-navigation scenarios to `e2e/admin-content-pages.spec.ts` — depends on T009 (same file)

### Implementation for User Story 2

- [x] T016 [US2] Build `src/lib/actions/create-content-page.ts` (unique-slug generation, `status = draft`, `system = false`) — depends on T005
- [x] T017 [US2] Wire Publish/Unpublish buttons (calling `014`'s `toggle-page-status.ts` directly, no new action) and View/Edit links (to the page's public slug) into `content-page-table.tsx` — depends on T011
- [x] T018 [US2] Wire "+ New page" into `content-page-table.tsx`/`page.tsx` — depends on T012, T016

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Moderator deletes a custom page (Priority: P3)

**Goal**: An inline delete-confirm for custom pages only, setting `status = draft` (never removing the row).

**Independent Test**: Delete a custom page via inline confirm and verify it becomes `draft` (not removed); confirm no system page ever offers Delete (quickstart.md Scenario 6-7).

### Tests for User Story 3

- [x] T019 [P] [US3] Integration test for `delete-content-page.ts` (sets `status = 'draft'`, never removes the row; rejected/not offered for `system = true` pages; role-gate rejection) in `src/lib/actions/delete-content-page.test.ts`
- [x] T020 [US3] Add the inline delete-confirm scenario (incl. Yes/No and the system-page restriction) to `e2e/admin-content-pages.spec.ts` — depends on T015 (same file)

### Implementation for User Story 3

- [x] T021 [US3] Build `src/lib/actions/delete-content-page.ts` (unconditional `status = 'draft'` write; rejects `system = true` targets) — depends on T005
- [x] T022 [US3] Wire the inline "Delete? Yes/No" confirm UI (with real focus management, matching Admin Users' established pattern) into `content-page-table.tsx`, hidden entirely for system-page rows — depends on T017, T021

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T023 Confirm `next build` succeeds locally and CI stays green with the new gated route, two Server Actions (plus the reused `014` toggle action), the extended schema, and the system-page seed
- [x] T024 Manually run quickstart.md Scenarios 1-8 end to end against local dev and confirm each passes
- [x] T025 [P] Update `docs/feature-list.md`, marking Admin Content Pages' spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T011 (extends the same table); T015 depends on US1's T009 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T017 (extends the same table's row actions); T020 depends on US2's T015 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/admin-content-pages.spec.ts` (T009) accumulates scenarios across all three stories — same file, sequential.
- `src/components/admin/content-page-table.tsx` (T011) is extended by US2 (T017, T018) and US3 (T022) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T005) can run once T002-T004 land.
- `create-content-page.ts` (US2) and `delete-content-page.ts` (US3) are independent files and can be built in parallel once Foundational is done, though their UI wiring (T018, T022) is sequential within `content-page-table.tsx`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything, incl. the
   system-page seed)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-2, 8
   independently
5. Moderators can see an accurate, searchable/filterable page list,
   including the seeded system pages — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready (incl. the system-page
   seed)
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (publish/unpublish/create/
   view/edit)
4. User Story 3 → validate independently (delete-as-draft)
5. Polish → build/CI confirmation, quickstart run-through, doc update
