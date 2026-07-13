---

description: "Task list for Admin Users implementation"
---

# Tasks: Admin Users

**Input**: Design documents from `/specs/016-admin-users/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the computed-flagged/query logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-role.ts` (Error Pages, `002`) exists in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema extensions, validation schemas, and gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Extend `user` with `bannedAt`, and `postings` (`003`) and `forumThreads` (`009`) with `removedAt`, in `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/admin-users.ts` — Zod schemas for search/filter and the ban/remove actions (data-model.md)
- [ ] T005 Build `src/app/admin/users/page.tsx` shell, gated by `require-role.ts` (moderator minimum) — depends on T001

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Moderator views, searches, and filters the user list (Priority: P1) 🎯 MVP

**Goal**: Accurate stats, search, status filter (including computed "Flagged"), and per-user content counts.

**Independent Test**: Confirm stats/search/filter accuracy and computed-flagged behavior; confirm access denial for a non-moderator (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T006 [P] [US1] Unit tests for `admin-users.ts`'s schemas in `src/lib/validations/admin-users.test.ts`
- [ ] T007 [P] [US1] Unit tests for `search-admin-users.ts` (computed-flagged logic, search/filter combination) in `src/lib/admin/search-admin-users.test.ts`
- [ ] T008 [US1] Playwright e2e spec covering stats, search, filter (including computed "Flagged"), and access-denial for a non-moderator, including an axe-core scan — creates `e2e/admin-users.spec.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Build `src/lib/admin/search-admin-users.ts` (research.md #3 for computed "Flagged") — depends on T002, T004
- [ ] T010 [US1] Build `src/components/admin/user-table.tsx` (stats + rows) — depends on T009
- [ ] T011 [US1] Wire `user-table.tsx` into `src/app/admin/users/page.tsx` — depends on T005, T010

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Moderator bans or unbans a user (Priority: P2)

**Goal**: Ban/Unban from the row or drawer, immediately reflected everywhere.

**Independent Test**: Ban and unban a user from the table row, confirming status updates everywhere (quickstart.md Scenario 2).

### Tests for User Story 2

- [ ] T012 [P] [US2] Integration test for `toggle-user-ban.ts` (ban/unban; role-gate rejection; unban reverts to "flagged" if still reported, else "active") in `src/lib/actions/toggle-user-ban.test.ts`
- [ ] T013 [US2] Add the ban/unban scenario to `e2e/admin-users.spec.ts` — depends on T008 (same file)

### Implementation for User Story 2

- [ ] T014 [US2] Build `toggle-user-ban.ts` in `src/lib/actions/toggle-user-ban.ts` — depends on T004
- [ ] T015 [US2] Wire the Ban/Unban control into `user-table.tsx` rows — depends on T010, T014

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Moderator reviews and removes a user's content (Priority: P3)

**Goal**: A user's detail drawer with Postings/Forum-posts tabs and a real, effect-having Remove action.

**Independent Test**: Review a user's content in the drawer, remove an item, and confirm it disappears from its public surface too (quickstart.md Scenario 3).

### Tests for User Story 3

- [ ] T016 [P] [US3] Integration test for `remove-user-content.ts` (marks `removedAt` on a posting or forum thread; role-gate rejection) in `src/lib/actions/remove-user-content.test.ts`
- [ ] T017 [P] [US3] Integration test confirming Home's `get-open-postings.ts` (`003`), Browse's `search-postings.ts` (`004`), and Forum index's `search-threads.ts` (`009`) now exclude `removedAt`-set rows (research.md #2)
- [ ] T018 [US3] Add the drawer review/remove scenario to `e2e/admin-users.spec.ts` — depends on T013 (same file)

### Implementation for User Story 3

- [ ] T019 [US3] Build `src/lib/admin/get-user-detail.ts` (postings, forum threads, open-report count) — depends on T002
- [ ] T020 [US3] Build `remove-user-content.ts` in `src/lib/actions/remove-user-content.ts` — depends on T004
- [ ] T021 [US3] Amend `src/lib/postings/get-open-postings.ts` (`003-home`) and `src/lib/postings/search-postings.ts` (`004-browse`): add a `removedAt IS NULL` condition — depends on T002
- [ ] T022 [US3] Amend `src/lib/forum/search-threads.ts` (`009-forum-index`): add the same `removedAt IS NULL` condition for `forumThreads` — depends on T002
- [ ] T023 [US3] Build `src/components/admin/user-drawer.tsx` (dialog/panel, focus trap, Postings/Forum-posts tabs, Ban/Message/Remove) — depends on T019, T014, T020
- [ ] T024 [US3] Wire `user-drawer.tsx` into `src/app/admin/users/page.tsx`, opened via each row's View action — depends on T011, T023

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T025 Confirm `next build` succeeds locally and CI stays green with the new gated route, three Server Actions, and the extended schema
- [ ] T026 Manually run quickstart.md Scenarios 1-3 end to end against local dev and confirm each passes
- [ ] T027 [P] Update `docs/feature-list.md`, marking Admin Users' spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T010 (extends the same table); T013 depends on US1's T008 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T014 (the drawer reuses the ban action); T018 depends on US2's T013 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/admin-users.spec.ts` (T008) accumulates scenarios across all three stories — same file, sequential.
- `src/app/admin/users/page.tsx` (T005/T011) is extended by US3 (T024) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004) can run once T002/T003 land.
- US3's amendment tasks (T021, T022) touch different already-merged features' files and can run in parallel with each other and with T019/T020.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Moderators can see accurate, searchable/filterable user data — the
   smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (ban/unban)
4. User Story 3 → validate independently (drawer + content removal)
5. Polish → build/CI confirmation, quickstart run-through, doc update
