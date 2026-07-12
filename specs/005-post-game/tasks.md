---

description: "Task list for Post a Game implementation"
---

# Tasks: Post a Game

**Input**: Design documents from `/specs/005-post-game/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — publishing is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the validation schema plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-verified-email.ts` (Auth & Onboarding, `001-auth-onboarding`) exists in the codebase before starting — this feature's Server Action depends on it directly (research.md #4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The extended table, the validation schema, the game-suggestion query, and the page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Extend the `postings` table in `src/db/schema.ts` with `tags`, `recurring`, `voiceLink` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/posting.ts` — the full Zod schema, including the Group size/Spots open cross-field refinement (data-model.md)
- [ ] T005 [P] Create `src/lib/postings/get-game-suggestions.ts` — reuses the most-common-games aggregate Home/Browse already compute (research.md #2) — depends on T002
- [ ] T006 Modify `src/app/post/page.tsx`: redirect an unauthenticated visitor to `/login` (FR-016), otherwise render the form shell

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Verified user publishes a listing that goes live immediately (Priority: P1) 🎯 MVP

**Goal**: A verified user fills the form, sees the live preview update, and publishes a valid, immediately-visible posting.

**Independent Test**: Fill in game + title, confirm Publish enables, confirm the preview reflects edits live, publish, and confirm the posting is visible on Home/Browse (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T007 [P] [US1] Unit tests for `posting.ts`'s Zod schema (valid payload, title/description length caps, tag cap, the stepper cross-field refinement) in `src/lib/validations/posting.test.ts`
- [ ] T008 [P] [US1] Integration test for `create-posting.ts` inserting a row with status `open` for a verified session in `src/lib/actions/create-posting.test.ts`
- [ ] T009 [US1] Playwright e2e spec covering the happy path (minimal fields, live preview updates, publish, visible on Home/Browse), including an axe-core scan — creates `e2e/post-game.spec.ts`

### Implementation for User Story 1

- [ ] T010 [US1] Build the `create-posting.ts` Server Action in `src/lib/actions/create-posting.ts`: validate via T004, insert with status `open` — depends on T004
- [ ] T011 [US1] Build `src/components/post-game/post-game-form.tsx`: all four form sections, Group size/Spots-open stepper clamping (client-side UX), live-bound to the shared `listing-card.tsx` for the preview, calls T010 on submit — depends on T004, T005, T010
- [ ] T012 [US1] Wire `post-game-form.tsx` into `src/app/post/page.tsx` — depends on T006, T011

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Unverified or logged-out visitor is blocked appropriately (Priority: P2)

**Goal**: Logged-out visitors are routed to log in; unverified sessions are blocked from publishing with a clear message.

**Independent Test**: As logged-out, confirm redirect to `/login`; as unverified, confirm publish is blocked with no posting created (quickstart.md Scenarios 2-3).

### Tests for User Story 2

- [ ] T013 [P] [US2] Integration test for `create-posting.ts` blocking an unverified session (no posting created, FR-017 message returned) in `src/lib/actions/create-posting.test.ts` — same file as T008
- [ ] T014 [US2] Add the logged-out-redirect and unverified-blocked scenarios to `e2e/post-game.spec.ts` — depends on T009 (same file)

### Implementation for User Story 2

- [ ] T015 [US2] Wire Auth & Onboarding's `require-verified-email.ts` gate into `create-posting.ts`, ahead of the insert (research.md #4) — depends on T010

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Invalid or incomplete input is prevented (Priority: P3)

**Goal**: Missing required fields or out-of-bounds values never create a posting, whether caught client-side or bypassed directly.

**Independent Test**: Attempt to publish missing game or title (blocked); attempt a direct request violating the stepper bounds (rejected server-side) (quickstart.md Scenario 4).

### Tests for User Story 3

- [ ] T016 [US3] Add the direct-request validation scenarios (missing game/title, stepper bounds violated bypassing the UI) to `src/lib/actions/create-posting.test.ts` — depends on T008 (same file)

### Implementation for User Story 3

- [ ] T017 [US3] Confirm `post-game-form.tsx`'s Publish control stays disabled until game+title are non-empty (client-side UX guard) and that `create-posting.ts` independently rejects the same missing/invalid cases regardless of UI state — depends on T011, T015

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 Confirm `next build` succeeds locally and CI stays green with the new `/post` route, Server Action, and extended `postings` schema
- [ ] T019 Manually run quickstart.md Scenarios 1-4 end to end against local dev and confirm each passes
- [ ] T020 [P] Update `docs/feature-list.md`, marking Post a Game's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T010 (extends the same Server Action); T014 depends on US1's T009 (same file).
- **User Story 3 (Phase 5)**: Depends on US2's T015 (the gate must already be wired in); T016 depends on US1's T008 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `create-posting.ts` (T010) accumulates behavior across all three stories (insert logic in US1, the verification gate in US2, guardrail confirmation in US3) — same file, so those tasks are sequential relative to each other.
- `create-posting.test.ts` (T008) and `e2e/post-game.spec.ts` (T009) accumulate the same way.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005) can run once T002/T003 land.
- US1's tests (T007-T009) can mostly run in parallel, aside from T008/T009 accumulating later scenarios from US2/US3.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. A verified user can publish a live listing — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (auth/verification gate)
4. User Story 3 → validate independently (validation guardrails)
5. Polish → build/CI confirmation, quickstart run-through, doc update
