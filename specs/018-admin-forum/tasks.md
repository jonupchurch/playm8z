---

description: "Task list for Admin Forum implementation"
---

# Tasks: Admin Forum

**Input**: Design documents from `/specs/018-admin-forum/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the shared moderation helpers, the report-target classification, and queue-membership logic, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently. Cross-feature amendments (to `009`/`010` and, retroactively, to `017`) are grouped in their own phases since they're independent of this feature's own new files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Confirm `src/lib/auth/require-role.ts` (`002`), `src/lib/actions/toggle-user-ban.ts` (`016`), and `017`'s `get-posting-queue.ts`/`create-posting.ts`/`resolve-posting-report.ts` exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema extensions (incl. `017`'s `warnings` generalization), shared moderation helpers, validation schemas, and the gated page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Extend `forumThreads` (`autoFlagReason`, `moderationReviewedAt`, `lockedAt`) and `forumReplies` (`autoFlagReason`, `moderationReviewedAt`, `removedAt`); generalize `017`'s `warnings` table (`targetType`/`targetId` replacing `postingId`) in `src/db/schema.ts` (data-model.md)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 [P] Create shared `src/lib/moderation/reason-severity.ts` (research.md #2 — canonical `reports.reason` taxonomy, corrected from `017`'s inline mismatch)
- [x] T005 [P] Create shared `src/lib/moderation/auto-flag-rules.ts` (research.md #3, extracted from `017`'s inline ruleset)
- [x] T006 [P] Create `src/lib/validations/admin-forum.ts` — Zod schemas for the filter and the resolve/ban actions (data-model.md)
- [x] T007 Build `src/app/admin/forum/page.tsx` shell, gated by `require-role.ts` (moderator minimum) — depends on T001

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Moderator views and filters the forum moderation queue (Priority: P1) 🎯 MVP

**Goal**: Accurate stats (incl. audit-log-derived "actioned today"), filter chips (All/Threads/Replies/Auto-flagged), and computed severity/reason chips on every queue card.

**Independent Test**: Confirm stats/filter/severity accuracy against seeded data using the canonical reason taxonomy; confirm access denial for a non-moderator (quickstart.md Scenario 1-3, 10).

### Tests for User Story 1

- [x] T008 [P] [US1] Unit tests for `reason-severity.ts` in `src/lib/moderation/reason-severity.test.ts`
- [x] T009 [P] [US1] Unit tests for `auto-flag-rules.ts` in `src/lib/moderation/auto-flag-rules.test.ts`
- [x] T010 [P] [US1] Unit tests for `admin-forum.ts`'s schemas in `src/lib/validations/admin-forum.test.ts`
- [x] T011 [P] [US1] Unit tests for `get-forum-queue.ts` (report-target classification, queue-membership, computed severity, filter narrowing) in `src/lib/admin/get-forum-queue.test.ts`
- [x] T012 [US1] Playwright e2e covering stats, filters, computed severity/reason labels, empty state, and access-denial for a non-moderator, including an axe-core scan — creates `e2e/admin-forum.spec.ts`

### Implementation for User Story 1

- [x] T013 [US1] Build `src/lib/admin/get-forum-queue.ts` (research.md #1 for target classification, #7 for the filter/query pattern) — depends on T002, T004, T005, T006
- [x] T014 [US1] Build `src/components/admin/forum-queue.tsx` (stats cards, filter chips, queue cards incl. type badge, reason chips, AUTO-FLAG banner) — depends on T013
- [x] T015 [US1] Wire `forum-queue.tsx` into `src/app/admin/forum/page.tsx` — depends on T007, T014

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Moderator reviews a thread or reply in context and resolves it (Priority: P2)

**Goal**: A review drawer (flagged content in context, "why it's here," author card) with Approve/Remove, both logging an audit entry.

**Independent Test**: Open a reply's drawer, confirm preceding-message context; Approve one item and Remove another, confirming reports resolve, the right `removedAt`/`moderationReviewedAt` updates, "actioned today" increments, and an audit entry is recorded each time (quickstart.md Scenario 4-6).

### Tests for User Story 2

- [x] T016 [P] [US2] Integration test for `resolve-forum-report.ts`'s approve/remove resolutions (report resolution, `moderationReviewedAt`/`removedAt` effects on the correct table, audit-log write, role-gate rejection) in `src/lib/actions/resolve-forum-report.test.ts`
- [x] T017 [P] [US2] Unit/integration test for `get-forum-review.ts` (preceding-context resolution, "why it's here," author card) in `src/lib/admin/get-forum-review.test.ts`
- [x] T018 [US2] Add the drawer/approve/remove scenario to `e2e/admin-forum.spec.ts` — depends on T012 (same file)

### Implementation for User Story 2

- [x] T019 [US2] Build `src/lib/admin/get-forum-review.ts` (content, immediately-preceding message for a reply, reports with reporters, auto-flag reason, author's prior-warnings/forum-posts counts) — depends on T002
- [x] T020 [US2] Build `src/lib/actions/resolve-forum-report.ts` supporting `approve`/`remove` (resolves open reports, sets `moderationReviewedAt` or the correct table's `removedAt`, calls `logAuditEntry()`) — depends on T006
- [x] T021 [US2] Build `src/components/admin/forum-review-drawer.tsx` (dialog/panel, focus trap, dimmed preceding-context block, "why it's here," author card, Approve/Remove buttons) — depends on T019, T020
- [x] T022 [US2] Wire `forum-review-drawer.tsx` into `src/app/admin/forum/page.tsx`, opened via each card's Review action — depends on T015, T021

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Moderator locks a thread or acts on the author (Priority: P3)

**Goal**: Lock (threads only, enforced against new replies), Warn author (generalized `warnings` row), Ban author (reuses `016`'s ban action, also removes the thread/reply under review).

**Independent Test**: Lock a thread and confirm a subsequent reply attempt is rejected; warn an author and confirm their combined, cross-feature prior-warnings count increases; ban an author and confirm their account is banned and that item's content is removed (quickstart.md Scenario 7-9).

### Tests for User Story 3

- [x] T023 [P] [US3] Integration test for `resolve-forum-report.ts`'s `lock` resolution (sets `lockedAt`; a subsequent `post-reply.ts` call against that thread is rejected) — extends `src/lib/actions/resolve-forum-report.test.ts` (same file as T016)
- [x] T024 [P] [US3] Integration test for `resolve-forum-report.ts`'s `warn` resolution (creates a `warnings` row with the generalized `targetType`/`targetId`; same report-resolution/`moderationReviewedAt` effect as approve) — same file as T016/T023
- [x] T025 [P] [US3] Integration test for `ban-forum-author.ts` (delegates to `016`'s `toggle-user-ban.ts`; removes the thread/reply under review; role-gate rejection) in `src/lib/actions/ban-forum-author.test.ts`
- [x] T026 [US3] Add the lock/warn/ban scenario to `e2e/admin-forum.spec.ts` — depends on T018 (same file)

### Implementation for User Story 3

- [x] T027 [US3] Extend `resolve-forum-report.ts` to support the `lock` resolution (threads only; sets `lockedAt`; audit-log write) — depends on T020
- [x] T028 [US3] Extend `resolve-forum-report.ts` to support the `warn` resolution (inserts a `warnings` row with `targetType`/`targetId`) — depends on T020
- [x] T029 [US3] Build `src/lib/actions/ban-forum-author.ts` (calls `016`'s `toggle-user-ban.ts`, then removes the thread/reply via the same path as `remove`) — depends on T020
- [x] T030 [US3] Wire Lock/Warn/Ban buttons into `forum-review-drawer.tsx` (Lock shown only for thread-type items) — depends on T021, T027, T028, T029

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Cross-Feature Amendments to Forum Index/Forum Thread (bounded — research.md #3, #6)

**Purpose**: Small, single-purpose additions to `009`'s and `010`'s already-merged files. Independent of Phases 3-5 (only needs T002/T005 from Foundational).

- [x] T031 [P] Amend `src/lib/actions/create-thread.ts` (`009-forum-index`): apply the shared `auto-flag-rules.ts` ruleset at creation, setting `autoFlagReason` — depends on T002, T005
- [x] T032 [P] Amend `src/lib/actions/post-reply.ts` (`010-forum-thread`): apply the shared `auto-flag-rules.ts` ruleset at creation, AND reject replying to a thread where `lockedAt` is set (research.md #6) — depends on T002, T005
- [x] T033 [P] Amend `src/lib/admin/get-thread.ts` (`010-forum-thread`): add `AND removedAt IS NULL` to its reply-listing query — depends on T002
- [x] T034 [P] Extend `src/lib/actions/create-thread.test.ts` (`009`) and `src/lib/actions/post-reply.test.ts` (`010`) to cover T031-T033's new behavior — depends on T031, T032, T033

---

## Phase 7: Retroactive Amendments to Admin Postings (bounded — research.md #2-#4)

**Purpose**: Small, single-purpose fixes to `017`'s already-merged files, closing the gaps this feature's own design work surfaced. Independent of Phases 3-6 (only needs T004/T005/T002 from Foundational).

- [x] T035 [P] Amend `src/lib/admin/get-posting-queue.ts` (`017-admin-postings`): import the shared `reason-severity.ts` instead of its own inline (and not-quite-correct) mapping — depends on T004
- [x] T036 [P] Amend `src/lib/actions/create-posting.ts` (`017-admin-postings`): import the shared `auto-flag-rules.ts` instead of its own inline copy — depends on T005
- [x] T037 [P] Amend `src/lib/actions/resolve-posting-report.ts` (`017-admin-postings`)'s `warn` path: write `warnings.targetType = 'posting'`, `targetId = <posting id>` instead of the old `postingId` column — depends on T002
- [x] T038 [P] Extend `017`'s `src/lib/admin/get-posting-queue.test.ts`, `src/lib/actions/create-posting.test.ts`, and `src/lib/actions/resolve-posting-report.test.ts` to cover T035-T037's new behavior — depends on T035, T036, T037

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T039 Confirm `next build` succeeds locally and CI stays green with the new gated route, five Server Actions (plus the reused `016` ban action), the extended schema (incl. `017`'s generalized `warnings`), and all amended files
- [x] T040 Manually run quickstart.md Scenarios 1-12 end to end against local dev and confirm each passes
- [x] T041 [P] Update `docs/feature-list.md`, marking Admin Forum's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T014 (drawer opens from the queue's Review action); T018 depends on US1's T012 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T020/T021 (extends the same resolution action and drawer); T026 depends on US2's T018 (same file).
- **Cross-Feature Amendments to `009`/`010` (Phase 6)**: Depends on Foundational (T002, T005) only — independent of Phases 3-5.
- **Retroactive Amendments to `017` (Phase 7)**: Depends on Foundational (T002, T004, T005) only — independent of Phases 3-6.
- **Polish (Phase 8)**: Depends on all three user stories and Phases 6-7.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/admin-forum.spec.ts` (T012) accumulates scenarios across all three stories — same file, sequential.
- `src/app/admin/forum/page.tsx` (T007/T015) is extended by US2 (T022) — same file, sequential.
- `resolve-forum-report.ts` (T020) is extended by US3 (T027, T028) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005, T006) can run once T002/T003 land.
- Phase 6's three amendment tasks (T031-T033) and Phase 7's three amendment tasks (T035-T037) each touch different already-merged features' files, are independent of Phases 3-5 and of each other's phase, and can all run in parallel once their Foundational dependencies land.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-3, 10 independently
5. Moderators can see an accurate, filterable forum moderation queue —
   the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready (incl. the two shared
   moderation helpers and `017`'s `warnings` generalization)
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (drawer + approve/remove)
4. User Story 3 → validate independently (lock/warn/ban)
5. Cross-Feature Amendments (Phases 6-7) → can be done any time after
   Foundational, validated via the extended existing test files
6. Polish → build/CI confirmation, quickstart run-through, doc update
