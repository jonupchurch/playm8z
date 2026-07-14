---

description: "Task list for Listing detail implementation"
---

# Tasks: Listing detail

**Input**: Design documents from `/specs/006-listing-detail/`

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

- [x] T001 Confirm `src/lib/auth/require-verified-email.ts` (Auth & Onboarding) exists in the codebase before starting — every write action in this feature depends on it directly

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new tables, the validation schemas, the roster derivation, and the page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add the `applications` and `questions` tables to `src/db/schema.ts` (data-model.md)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 [P] Create `src/lib/validations/listing-detail.ts` — Zod schemas for the apply message, question text, and reply text (data-model.md)
- [x] T005 [P] Create `src/lib/postings/get-roster.ts` — derives the host + accepted-applicants + open-count roster (research.md #1) — depends on T002
- [x] T006 Build `src/app/listing/[id]/page.tsx` shell: fetch the posting by id (calling Next's `notFound()` — Error Pages' 404 state — when it doesn't exist), derive the viewer's state (host / not-applied / pending / accepted / full), and render the breadcrumb, header, About section, and Details grid — depends on T005

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Visitor applies for an open slot (Priority: P1) 🎯 MVP

**Goal**: A verified visitor applies with an optional message, sees confirmation, and can withdraw.

**Independent Test**: Apply, confirm the confirmation state and a pending Application, reload and confirm persistence, withdraw and confirm the form reappears (quickstart.md Scenario 1).

### Tests for User Story 1

- [x] T007 [P] [US1] Unit tests for `listing-detail.ts`'s message schema (length cap) in `src/lib/validations/listing-detail.test.ts`
- [x] T008 [P] [US1] Integration test for `apply-to-posting.ts` (creates a pending Application; rejects a second active application from the same user; rejects for the host or a full listing) in `src/lib/actions/apply-to-posting.test.ts`
- [x] T009 [P] [US1] Integration test for `withdraw-application.ts` (sets status to `withdrawn`, only by the applicant) in `src/lib/actions/withdraw-application.test.ts`
- [x] T010 [US1] Playwright e2e spec covering apply → confirmation → reload-persists → withdraw, including an axe-core scan — creates `e2e/listing-detail.spec.ts`

### Implementation for User Story 1

- [x] T011 [US1] Build the `apply-to-posting.ts` Server Action in `src/lib/actions/apply-to-posting.ts` — depends on T004
- [x] T012 [US1] Build the `withdraw-application.ts` Server Action in `src/lib/actions/withdraw-application.ts` — depends on T004
- [x] T013 [US1] Build `src/components/listing/apply-panel.tsx`: apply-form, confirmation, and withdraw states — depends on T011, T012
- [x] T014 [US1] Wire `apply-panel.tsx` into `src/app/listing/[id]/page.tsx` — depends on T006, T013

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Visitor asks a question; the host replies (Priority: P2)

**Goal**: A verified non-host visitor asks a question; the host replies; both are visible to everyone.

**Independent Test**: Ask as a non-host user, confirm it appears; reply as the host, confirm the reply is visible to any viewer (quickstart.md Scenario 2).

### Tests for User Story 2

- [x] T015 [P] [US2] Integration test for `ask-question.ts` (creates a question; blocked for an unverified session) in `src/lib/actions/ask-question.test.ts`
- [x] T016 [P] [US2] Integration test for `reply-to-question.ts` (the host can reply; a non-host session is rejected) in `src/lib/actions/reply-to-question.test.ts`
- [x] T017 [US2] Add the Q&A scenario (ask as non-host, reply as host, visible to all subsequent viewers) to `e2e/listing-detail.spec.ts` — depends on T010 (same file)

### Implementation for User Story 2

- [x] T018 [US2] Build the `ask-question.ts` Server Action in `src/lib/actions/ask-question.ts` — depends on T004
- [x] T019 [US2] Build the `reply-to-question.ts` Server Action in `src/lib/actions/reply-to-question.ts`, including the host-only ownership check (research.md #3) — depends on T004
- [x] T020 [US2] Build `src/components/listing/qa-thread.tsx`: question list, ask input, host-only reply control per unanswered question — depends on T018, T019
- [x] T021 [US2] Wire `qa-thread.tsx` into `src/app/listing/[id]/page.tsx` — depends on T006, T020

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - The page reflects the listing's real, current capacity (Priority: P3)

**Goal**: Recruiting/full state, roster display, and viewer-specific apply-panel state are all accurate.

**Independent Test**: A zero-open-spots listing shows "full" with no apply form; the host sees no apply form on their own listing; an accepted applicant appears in the roster with no role label (quickstart.md Scenario 3).

### Tests for User Story 3

- [x] T022 [US3] Add the full-state, host-viewing-own-listing, and accepted-roster-display scenarios to `e2e/listing-detail.spec.ts` — depends on T017 (same file)

### Implementation for User Story 3

- [x] T023 [US3] Build `src/components/listing/roster.tsx`: host row, accepted-member rows, dashed open rows — no role/class label on any row (FR-004) — depends on T005
- [x] T024 [US3] Wire the recruiting/full header state and the host/full/pending/accepted viewer-state branching into `src/app/listing/[id]/page.tsx` and `apply-panel.tsx` — depends on T006, T013, T023

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T025 Confirm `next build` succeeds locally and CI stays green with the new dynamic route, five Server Actions, and two new tables
- [x] T026 Manually run quickstart.md Scenarios 1-3 end to end against local dev and confirm each passes
- [x] T027 [P] Update `docs/feature-list.md`, marking Listing detail's spec/plan/tasks as complete
- [x] T028 *(added 2026-07-12, spec.md's amended FR-014/FR-018)* Build `toggle-saved-listing.ts` (`src/lib/actions/toggle-saved-listing.ts`), inserting/deleting a row in Profile's (`007`) `savedListings` table, gated the same way as apply/ask (auth + email-verified) — depends on Profile's `savedListings` table existing (whichever of the two features' migrations lands first, per data-model.md's note)
- [x] T029 *(added 2026-07-12)* Wire a Save/Unsave control into the apply panel or listing header, reflecting the viewer's current saved state — depends on T028
- [x] T030 *(added 2026-07-12, spec.md's amended FR-019)* Wire a "Report" control into the apply panel (and each Q&A entry) opening Notifications + Report modal's (`012`) existing report-modal component, passing this listing (or the specific question) as the target — depends on `012`'s report-modal component existing. **Completed 2026-07-13** as a bounded amendment alongside `012-notifications-and-report-modal`'s own implementation: `apply-panel.tsx` reports the posting (`targetType='posting'`, blocking targets `hostId`); each `qa-thread.tsx` question reports its asker directly (`targetType='user'`, since `reports.targetType`'s enum has no dedicated "question" variant).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; T017 depends on US1's T010 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US1's T013 (extends the apply panel's state branching); T022 depends on US2's T017 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/listing-detail.spec.ts` (T010) accumulates scenarios across all three stories — same file, sequential.
- `src/app/listing/[id]/page.tsx` (T006) is wired into by US1, US2, and US3 — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005) can run once T002/T003 land.
- US1's tests (T007-T009) can run in parallel; US2's tests (T015-T016) can run in parallel with each other and with US1's/US3's work.
- `apply-to-posting.ts` and `withdraw-application.ts` (T011, T012) touch different files and can be built in parallel; same for `ask-question.ts` and `reply-to-question.ts` (T018, T019).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Apply, confirm, and withdraw all work — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (Q&A)
4. User Story 3 → validate independently (capacity correctness)
5. Polish → build/CI confirmation, quickstart run-through, doc update
