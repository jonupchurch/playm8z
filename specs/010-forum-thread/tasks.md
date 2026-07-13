---

description: "Task list for Forum Thread implementation"
---

# Tasks: Forum Thread

**Input**: Design documents from `/specs/010-forum-thread/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the validation/derivation logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Confirm `src/lib/auth/require-verified-email.ts` (Auth & Onboarding) and the `reports` table (Blocked Users, `008`) exist in the codebase before starting — both are direct dependencies of this feature's write actions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new tables, validation schemas, and the core thread-read query every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add the `forumReplies`, `likes`, and `threadSubscriptions` tables to `src/db/schema.ts` (data-model.md)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 [P] Create `src/lib/validations/forum-thread.ts` — Zod schemas for reply/quote/like/report input (data-model.md)
- [x] T005 Create `src/lib/forum/get-thread.ts` — fetches the thread, OP, sorted replies (Top/Newest/Oldest), and related threads — depends on T002
- [x] T006 Create `src/lib/forum/increment-view-count.ts` — depends on T002

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Any visitor reads a thread and its replies (Priority: P1) 🎯 MVP

**Goal**: OP renders distinctly, replies sort correctly, right rail is accurate, view count increments.

**Independent Test**: Read a thread, sort replies three ways, confirm the right rail and view-count increment (quickstart.md Scenario 1).

### Tests for User Story 1

- [x] T007 [P] [US1] Unit tests for `forum-thread.ts`'s schemas in `src/lib/validations/forum-thread.test.ts`
- [x] T008 [P] [US1] Unit tests for `get-thread.ts`'s sort logic (Top/Newest/Oldest) and related-thread matching in `src/lib/forum/get-thread.test.ts`
- [x] T009 [US1] Playwright e2e spec covering read, sort, right-rail accuracy, and view-count increment, including an axe-core scan — creates `e2e/forum-thread.spec.ts`

### Implementation for User Story 1

- [x] T010 [US1] Build `src/components/forum/original-post.tsx` — depends on T004
- [x] T011 [US1] Build `src/components/forum/reply-card.tsx` (read-only display for now — like/Report/Quote controls wired in later stories) — depends on T004
- [x] T012 [US1] Build `src/components/forum/thread-right-rail.tsx` — depends on T005
- [x] T013 [US1] Build `src/app/forum/thread/[id]/page.tsx`: fetch via `get-thread.ts`, increment the view count, render OP + replies + sort + right rail — depends on T005, T006, T010, T011, T012

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Verified user posts a reply, optionally quoting another (Priority: P2)

**Goal**: A verified user posts a reply, with an optional Quote reference, appearing immediately.

**Independent Test**: Post a reply, then post one quoting an existing reply, confirm both display correctly (quickstart.md Scenario 2).

### Tests for User Story 2

- [x] T014 [P] [US2] Integration test for `post-reply.ts` (creates a reply and updates `replyCount`; `quotedReplyId` set correctly; blocked for an unverified session) in `src/lib/actions/post-reply.test.ts`
- [x] T015 [US2] Add the reply/quote scenario to `e2e/forum-thread.spec.ts` — depends on T009 (same file)

### Implementation for User Story 2

- [x] T016 [US2] Build `post-reply.ts` in `src/lib/actions/post-reply.ts` — depends on T004
- [x] T017 [US2] Build `src/components/forum/reply-composer.tsx`, including a quoted-reply preview when quoting — depends on T016
- [x] T018 [US2] Wire `reply-composer.tsx` and the "Quote" action (on `reply-card.tsx`) into `src/app/forum/thread/[id]/page.tsx` — depends on T011, T013, T017

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Verified user likes and reports content (Priority: P3)

**Goal**: Like/unlike the OP or a reply exactly once each; report a reply or thread.

**Independent Test**: Like, unlike, attempt a rapid double-like, and report a reply; confirm the count/report record (quickstart.md Scenario 3).

### Tests for User Story 3

- [x] T019 [P] [US3] Integration test for `toggle-like.ts` (like/unlike, denormalized count stays in sync, a duplicate-like race is rejected by the database's unique constraint) in `src/lib/actions/toggle-like.test.ts`
- [x] T020 [P] [US3] Integration test for `report-forum-content.ts` (writes into `008`'s `reports` table with `targetType = 'forum'`) in `src/lib/actions/report-forum-content.test.ts`
- [x] T021 [US3] Add the like/unlike and report scenarios to `e2e/forum-thread.spec.ts` — depends on T015 (same file)

### Implementation for User Story 3

- [x] T022 [US3] Build `toggle-like.ts` in `src/lib/actions/toggle-like.ts` — depends on T004
- [x] T023 [US3] Build `report-forum-content.ts` in `src/lib/actions/report-forum-content.ts` (reuses `008`'s `reports` table) — depends on T004
- [x] T024 [US3] Build `toggle-subscription.ts` in `src/lib/actions/toggle-subscription.ts` — depends on T004
- [x] T025 [US3] Wire like, Report, and Subscribe controls into `reply-card.tsx` and the thread header — depends on T018, T022, T023, T024

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T026 Confirm `next build` succeeds locally and CI stays green with the new route, four Server Actions, three new tables, and the reused `reports` write path
- [x] T027 Manually run quickstart.md Scenarios 1-3 end to end against local dev and confirm each passes
- [x] T028 [P] Update `docs/feature-list.md`, marking Forum Thread's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T013 (extends the same page); T015 depends on US1's T009 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T018 (extends the same page/reply-card); T021 depends on US2's T015 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/forum-thread.spec.ts` (T009) accumulates scenarios across all three stories — same file, sequential.
- `reply-card.tsx` (T011) is extended by US3 (T025) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004) can run once T002/T003 land; T005/T006 depend on T002 but not each other.
- US1's tests (T007-T008) can run in parallel; US3's Server Actions (T022-T024) touch different files and can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Anyone can read a thread and its replies — the smallest useful
   slice (assumes seeded thread/reply data)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (reply + quote)
4. User Story 3 → validate independently (like + report)
5. Polish → build/CI confirmation, quickstart run-through, doc update
