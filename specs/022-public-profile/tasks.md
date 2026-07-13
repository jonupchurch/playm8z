---

description: "Task list for Public Profile implementation"
---

# Tasks: Public Profile

**Input**: Design documents from `/specs/022-public-profile/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the computed aggregates, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-verified-email.ts` (`001`), `006`'s apply action, `008`'s block action, `011`'s `accept-request.ts`/`decline-request.ts`/`get-inbox-list.ts`, and `012`'s report flow exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema additions, validation schemas, and public page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add `follows` and `reviews` tables; extend `applications` (`006`) with `initiatedBy` in `src/db/schema.ts` (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Create `src/lib/validations/public-profile.ts` — Zod schemas for follow/invite (data-model.md)
- [ ] T005 Build `src/app/u/[handle]/page.tsx` shell (public route, no auth gate to view) — depends on T002

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Any visitor views a user's public profile (Priority: P1) 🎯 MVP

**Goal**: Accurate identity/bio/stats/games/open-postings/reviews for any visitor, with none of the six dropped wireframe elements ever appearing.

**Independent Test**: Confirm accurate rendering (and correct not-found handling) against seeded data as a logged-out visitor (quickstart.md Scenario 1-2).

### Tests for User Story 1

- [ ] T006 [P] [US1] Unit tests for `get-public-profile.ts` (computed `sessions` stat per research.md #2; confirms no dropped-element data is even fetched) in `src/lib/profile/get-public-profile.test.ts`
- [ ] T007 [US1] Playwright e2e covering the public view (logged out and in), not-found handle, and absence of all six dropped elements, including an axe-core scan — creates `e2e/public-profile.spec.ts`

### Implementation for User Story 1

- [ ] T008 [US1] Build `src/lib/profile/get-public-profile.ts` (identity, stats incl. computed `sessions`, games, open postings, reviews) — depends on T002
- [ ] T009 [US1] Build `src/components/profile/profile-header.tsx`, `profile-games.tsx`, `profile-open-parties.tsx` (reusing `006`'s Apply action via "Request"), and `profile-reviews.tsx` (display-only, empty-state aware) — depends on T008
- [ ] T010 [US1] Wire all four components into `src/app/u/[handle]/page.tsx`, including a not-found response (`002`) for an unmatched handle — depends on T005, T009

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - An authenticated visitor follows, messages, or invites the profile owner to their party (Priority: P2)

**Goal**: Follow/Unfollow, Message (reusing `011`), and a host-initiated Invite that reuses `006`'s applications with the invited user (not the host) making the accept/decline call.

**Independent Test**: Follow/unfollow; message; invite from an eligible open posting and confirm the pending request surfaces in the INVITED USER's inbox and resolves identically to a normal acceptance (quickstart.md Scenario 3-7).

### Tests for User Story 2

- [ ] T011 [P] [US2] Integration test for `toggle-follow.ts` (create/delete, self-follow rejection, unauthenticated/unverified rejection) in `src/lib/actions/toggle-follow.test.ts`
- [ ] T012 [P] [US2] Integration test for `invite-to-party.ts` (eligibility validation — host of an open posting with an available seat; correct `initiatedBy`/`applicantId`/`postingId`; unauthenticated/unverified rejection) in `src/lib/actions/invite-to-party.test.ts`
- [ ] T013 [P] [US2] Integration test for `011`'s amended `accept-request.ts`/`decline-request.ts` (authorized-actor branch for both `initiatedBy` values — the wrong party's attempt is rejected in either direction) — extends `011`'s existing test files
- [ ] T014 [P] [US2] Integration test for `011`'s amended `get-inbox-list.ts` (surfaces a pending host-initiated invite in the invited user's own inbox) — extends `011`'s existing test file
- [ ] T015 [US2] Add the Follow/Message/Invite scenario to `e2e/public-profile.spec.ts` — depends on T007 (same file)

### Implementation for User Story 2

- [ ] T016 [US2] Build `src/lib/actions/toggle-follow.ts` — depends on T004
- [ ] T017 [US2] Build `src/lib/actions/invite-to-party.ts` (research.md #3) — depends on T004
- [ ] T018 [US2] Amend `011`'s `accept-request.ts` and `decline-request.ts`: authorized actor is the invited applicant when `initiatedBy = 'host'`, unchanged (host) otherwise — depends on T002
- [ ] T019 [US2] Amend `011`'s `get-inbox-list.ts`: also surface a pending host-initiated invite in the invited applicant's own inbox — depends on T002
- [ ] T020 [US2] Wire Follow/Message/Invite controls (incl. a posting picker when the host has more than one eligible open posting) into `profile-header.tsx` — depends on T009, T016, T017

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - An authenticated visitor sees mutual connections, reports, or blocks the profile owner (Priority: P3)

**Goal**: An accurate "You have in common" sidebar (auth'd, non-self viewers only) and a "..." menu reusing `012`'s report flow and `008`'s block action.

**Independent Test**: Confirm mutual-follow/shared-games accuracy for a viewer who shares both with the profile owner; confirm Report/Block reuse the existing canonical flows (quickstart.md Scenario 8-9).

### Tests for User Story 3

- [ ] T021 [P] [US3] Unit tests for `get-in-common.ts` (mutual-follow intersection, shared-games intersection, absence for a logged-out/self viewer) in `src/lib/profile/get-in-common.test.ts`
- [ ] T022 [US3] Add the "You have in common" and Report/Block scenarios to `e2e/public-profile.spec.ts` — depends on T015 (same file)

### Implementation for User Story 3

- [ ] T023 [US3] Build `src/lib/profile/get-in-common.ts` (research.md #5) — depends on T002
- [ ] T024 [US3] Build `src/components/profile/profile-in-common.tsx` — depends on T023
- [ ] T025 [US3] Wire the "..." menu (Share profile — client-only; Report user — opens `012`'s canonical modal; Block user — calls `008`'s existing block action) and `profile-in-common.tsx` into `profile-header.tsx`/`page.tsx` — depends on T010, T020, T024

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T026 Confirm `next build` succeeds locally and CI stays green with the new public route, three Server Actions (plus reused `006`/`008`/`012` flows), the extended schema, and the amended `011` files
- [ ] T027 Manually run quickstart.md Scenarios 1-10 end to end against local dev and confirm each passes
- [ ] T028 [P] Update `docs/feature-list.md`, marking Public Profile's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T009 (extends the same header component); T015 depends on US1's T007 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US2's T020 (extends the same header); T022 depends on US2's T015 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/public-profile.spec.ts` (T007) accumulates scenarios across all three stories — same file, sequential.
- `src/components/profile/profile-header.tsx` (T009) is extended by US2 (T020) and US3 (T025) — same file, sequential.
- `011`'s `accept-request.ts`/`decline-request.ts`/`get-inbox-list.ts` (T018, T019) are amendments to already-merged files — sequential with respect to each other only where they touch the same file.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004) can run once T002/T003 land.
- `toggle-follow.ts` (T016) and `invite-to-party.ts` (T017) are independent files and can be built in parallel; the `011` amendments (T018, T019) are independent of both and can run in parallel with them once T002 lands.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-2 independently
5. Any visitor can see an accurate public profile with no dropped/
   decorative elements — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (Follow/Message/Invite, incl.
   the reversed-ownership invite flow)
4. User Story 3 → validate independently (mutual connections,
   Report/Block)
5. Polish → build/CI confirmation, quickstart run-through, doc update
