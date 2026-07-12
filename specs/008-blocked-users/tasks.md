---

description: "Task list for Blocked Users implementation"
---

# Tasks: Blocked Users

**Input**: Design documents from `/specs/008-blocked-users/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the validation logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-verified-email.ts` (Auth & Onboarding) exists in the codebase before starting — both Server Actions in this feature depend on it directly

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new tables, validation schemas, candidate search, and the Profile link every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add the `blocks` and `reports` tables to `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/blocking.ts` — Zod schemas for search, target, and `alsoReport` (data-model.md)
- [ ] T005 [P] Create `src/lib/users/search-users.ts` — candidate search excluding self and already-actively-blocked users
- [ ] T006 Add a link to `/profile/account/blocked` from Profile's existing `src/app/profile/account/page.tsx` (research.md #1) — a small, purely-additive edit to an already-merged file

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - User views, searches, and unblocks from their blocked list (Priority: P1) 🎯 MVP

**Goal**: View the blocked list with a live count, search it, and unblock via a confirm dialog; both empty states render correctly.

**Independent Test**: With a blocked user, view/search/unblock and confirm the list updates; confirm both empty states (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T007 [P] [US1] Unit tests for `blocking.ts`'s schemas in `src/lib/validations/blocking.test.ts`
- [ ] T008 [P] [US1] Integration test for `unblock-user.ts` (only the original blocker can unblock; sets `unblockedAt`) in `src/lib/actions/unblock-user.test.ts`
- [ ] T009 [US1] Playwright e2e spec covering view/search/unblock and both empty states, including an axe-core scan of the Unblock dialog — creates `e2e/blocked-users.spec.ts`

### Implementation for User Story 1

- [ ] T010 [US1] Build `unblock-user.ts` in `src/lib/actions/unblock-user.ts` — depends on T004
- [ ] T011 [US1] Build `src/components/blocking/unblock-modal.tsx` — a focus-trapped confirm dialog (research.md #2) — depends on T010
- [ ] T012 [US1] Build `src/app/profile/account/blocked/page.tsx`: list, live count, search, both empty states, wires `unblock-modal.tsx` — depends on T005, T011

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - User blocks someone new (Priority: P2)

**Goal**: Search/pick a candidate, confirm the block (optionally reporting), and see it take effect immediately.

**Independent Test**: Block a new user with and without "Also report," confirm the resulting list row and (when checked) the `reports` row (quickstart.md Scenario 2).

### Tests for User Story 2

- [ ] T013 [P] [US2] Integration test for `block-user.ts` (creates a block; rejects self-block; rejects a duplicate active block; the optional `reports` row) in `src/lib/actions/block-user.test.ts`
- [ ] T014 [US2] Add the Block modal scenario (pick, confirm, with/without report) to `e2e/blocked-users.spec.ts`, including an axe-core scan of the Block dialog — depends on T009 (same file)

### Implementation for User Story 2

- [ ] T015 [US2] Build `block-user.ts` in `src/lib/actions/block-user.ts` — depends on T004
- [ ] T016 [US2] Build `src/components/blocking/block-modal.tsx` — reusable, accepting an optional pre-selected target, focus-trapped (research.md #2) — depends on T015, T005
- [ ] T017 [US2] Wire the "Block a user" entry point into `src/app/profile/account/blocked/page.tsx` — depends on T012, T016

**Checkpoint**: Both user stories independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T018 Confirm `next build` succeeds locally and CI stays green with the new nested route, two Server Actions, and two new tables
- [ ] T019 Manually run quickstart.md Scenarios 1-3 end to end against local dev and confirm each passes
- [ ] T020 [P] Update `docs/feature-list.md`, marking Blocked Users' spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T012 (extends the same page); T014 depends on US1's T009 (same file).
- **Polish (Phase 5)**: Depends on both user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/blocked-users.spec.ts` (T009) accumulates scenarios across both stories — same file, sequential.
- `src/app/profile/account/blocked/page.tsx` (T012) is extended by US2 (T017) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005) can run once T002/T003 land.
- `unblock-user.ts` (T010) and `block-user.ts` (T015) touch different files and, once Foundational is done, could be built in parallel — though US2 is prioritized after US1 by convention.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. A user can view, search, and unblock — the smallest useful slice
   (assumes at least one block already exists, e.g. seeded directly)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (blocking a new user)
4. Polish → build/CI confirmation, quickstart run-through, doc update
