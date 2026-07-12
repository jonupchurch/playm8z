---

description: "Task list for Inbox / messaging implementation"
---

# Tasks: Inbox / messaging

**Input**: Design documents from `/specs/011-inbox-messaging/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the merge/validation logic plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-verified-email.ts` (Auth & Onboarding) and the `blocks` table (Blocked Users, `008`) exist in the codebase before starting — both are direct dependencies of this feature's write actions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new tables, validation schemas, merged-list query, and the authenticated layout every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add the `conversations` and `messages` tables to `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/inbox.ts` — Zod schemas for message body, recipients, group name (data-model.md)
- [ ] T005 Create `src/lib/inbox/get-inbox-list.ts` — merges real conversations with pending-hosted-request Applications, sorted by recent activity — depends on T002
- [ ] T006 Build `src/app/inbox/layout.tsx`: redirect an unauthenticated visitor to `/login` (FR-001), render the conversation-list shell — depends on T005

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - User reads and sends messages in their conversations (Priority: P1) 🎯 MVP

**Goal**: Unified, searchable conversation list; open a conversation, read history with correct group sender-grouping, send a message.

**Independent Test**: View the merged list, search it, open a conversation, send a message (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T007 [P] [US1] Unit tests for `inbox.ts`'s schemas in `src/lib/validations/inbox.test.ts`
- [ ] T008 [P] [US1] Unit tests for `get-inbox-list.ts`'s merge/sort logic in `src/lib/inbox/get-inbox-list.test.ts`
- [ ] T009 [P] [US1] Integration test for `send-message.ts` (creates a message, updates `lastMessageAt`, blocked for an unverified session) in `src/lib/actions/send-message.test.ts`
- [ ] T010 [US1] Playwright e2e spec covering the list view, search, opening a conversation, sending a message, and group-chat sender-grouping, including an axe-core scan — creates `e2e/inbox.spec.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Build `send-message.ts` in `src/lib/actions/send-message.ts` — depends on T004
- [ ] T012 [US1] Build `src/components/inbox/conversation-list.tsx` (including search) — depends on T005
- [ ] T013 [US1] Build `src/components/inbox/message-thread.tsx`, including an `aria-live` region and sender-grouping for consecutive group-chat messages — depends on T004
- [ ] T014 [US1] Build `src/app/inbox/[conversationId]/page.tsx`: fetch history, render `message-thread.tsx`, wire the composer to `send-message.ts`, and a client-side poll wrapper (research.md #2) — depends on T011, T013
- [ ] T015 [US1] Wire `conversation-list.tsx` into `src/app/inbox/layout.tsx` — depends on T006, T012

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - User starts a new conversation (Priority: P2)

**Goal**: Compose a direct (reusing an existing one) or group conversation, with blocked/blocking users excluded.

**Independent Test**: Start a direct chat, start a group chat, confirm a blocked relationship is excluded and rejected server-side if bypassed (quickstart.md Scenario 2).

### Tests for User Story 2

- [ ] T016 [P] [US2] Integration test for `start-conversation.ts` (direct conversations reuse an existing one; group creation; block exclusion enforced server-side even if the UI is bypassed) in `src/lib/actions/start-conversation.test.ts`
- [ ] T017 [US2] Add the compose scenario (direct, group, blocked-exclusion) to `e2e/inbox.spec.ts`, including an axe-core scan of the compose modal — depends on T010 (same file)

### Implementation for User Story 2

- [ ] T018 [US2] Build `search-contacts.ts` in `src/lib/inbox/search-contacts.ts` — excludes self and any blocked/blocking user (research.md #4) — depends on T002
- [ ] T019 [US2] Build `start-conversation.ts` in `src/lib/actions/start-conversation.ts` — depends on T004, T018
- [ ] T020 [US2] Build `src/components/inbox/compose-modal.tsx` — depends on T019
- [ ] T021 [US2] Wire the "New" entry point into `src/app/inbox/layout.tsx` — depends on T015, T020

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Host accepts or declines a pending join request (Priority: P3)

**Goal**: Accept atomically updates Application/Posting/Conversation together; Decline updates only the Application; neither shows controls again afterward.

**Independent Test**: Accept one pending request and confirm all three effects; decline another and confirm only the Application changes (quickstart.md Scenario 3).

### Tests for User Story 3

- [ ] T022 [P] [US3] Integration test for `accept-request.ts` (atomic Application/Posting/Conversation update; a forced mid-transaction failure leaves nothing partially applied) in `src/lib/actions/accept-request.test.ts`
- [ ] T023 [P] [US3] Integration test for `decline-request.ts` (Application declined, no change to `seatsOpen`, no conversation created) in `src/lib/actions/decline-request.test.ts`
- [ ] T024 [US3] Add the accept/decline scenario to `e2e/inbox.spec.ts` — depends on T017 (same file)

### Implementation for User Story 3

- [ ] T025 [US3] Build `accept-request.ts` in `src/lib/actions/accept-request.ts` — a single database transaction (research.md #3) — depends on T004
- [ ] T026 [US3] Build `decline-request.ts` in `src/lib/actions/decline-request.ts` — depends on T004
- [ ] T027 [US3] Build `src/components/inbox/request-banner.tsx` — depends on T025, T026
- [ ] T028 [US3] Wire `request-banner.tsx` into `src/app/inbox/[conversationId]/page.tsx` for request-type items — depends on T014, T027

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T029 Confirm `next build` succeeds locally and CI stays green with the new routes, six Server Actions, and two new tables
- [ ] T030 Manually run quickstart.md Scenarios 1-3 end to end against local dev and confirm each passes
- [ ] T031 [P] Update `docs/feature-list.md`, marking Inbox / messaging's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T015 (extends the same layout); T017 depends on US1's T010 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US1's T014 (extends the same page); T024 depends on US2's T017 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/inbox.spec.ts` (T010) accumulates scenarios across all three stories — same file, sequential.
- `src/app/inbox/layout.tsx` (T006) is extended by US2 (T021); `src/app/inbox/[conversationId]/page.tsx` (T014) is extended by US3 (T028) — both same-file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004) can run once T002/T003 land.
- US1's tests (T007-T009) can run in parallel; US3's Server Actions (T025, T026) touch different files and can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. A user can read and send messages in their existing conversations —
   the smallest useful slice (assumes seeded conversation data)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (starting new conversations)
4. User Story 3 → validate independently (accept/decline)
5. Polish → build/CI confirmation, quickstart run-through, doc update
