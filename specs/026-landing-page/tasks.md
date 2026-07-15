---

description: "Task list for Landing page implementation"
---

# Tasks: Landing page

**Input**: Design documents from `/specs/026-landing-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — this feature has no Server Actions of its own, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the real computed stats and hero-card selection, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Confirm Home's root `src/app/page.tsx` (`003`, its existing unauthenticated-redirect placeholder), `011`'s `accept-request.ts`, Browse's (`004`) 8-genre enum, and Admin Content Pages' (`021`) seeded system pages all exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one schema addition and the shared stats query every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add `applications.acceptedAt` (nullable timestamp) in `src/db/schema.ts` (data-model.md)
- [x] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [x] T004 Build `src/lib/landing/get-landing-stats.ts` (total players, distinct games, parties formed this week, 1-2 real open postings for the hero card with a fallback case, per-genre open counts — research.md #1-#2, #4, #7) — depends on T002

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - A logged-out visitor sees the marketing landing page at `/` (Priority: P1) 🎯 MVP

**Goal**: A real, honest marketing page at `/` for unauthenticated visitors, with Home's authenticated experience completely unchanged.

**Independent Test**: Confirm the unauthenticated root route shows this content (not a redirect, not Home), every stat is real, and the authenticated root route is unaffected (quickstart.md Scenario 1-3, 5-7).

### Tests for User Story 1

- [x] T005 [P] [US1] Unit tests for `get-landing-stats.ts` (the three real stats, hero-card selection including the zero-postings fallback, per-genre counts) in `src/lib/landing/get-landing-stats.test.ts`
- [x] T006 [US1] Playwright e2e covering the unauthenticated root route's content, the authenticated root route's unaffected behavior, the real stats (and absence of any fabricated ones), the reworded features copy, and genre counts, including an axe-core scan — creates `e2e/landing-page.spec.ts`

### Implementation for User Story 1

- [x] T007 [US1] Build `src/components/landing/landing-hero.tsx` (rotating word, real "open parties right now" stat, real floating card(s) with an honest fallback — research.md #2, #4) — depends on T004
- [x] T008 [US1] Build `src/components/landing/landing-trust-bar.tsx` (three real stats, no fourth fabricated one — research.md #1) — depends on T004
- [x] T009 [US1] Build `src/components/landing/landing-genres.tsx` (real per-genre open counts — research.md #7) — depends on T004
- [x] T010 [US1] Build `src/components/landing/landing-how-it-works.tsx`, `landing-features.tsx` (reworded profiles/ratings copy — research.md #5), `landing-testimonials.tsx` (fixed marketing copy — research.md #6), and `landing-final-cta.tsx` (static content, no data dependency)
- [x] T011 [US1] Amend Home's (`003`) `src/app/page.tsx`: render this feature's assembled content for an unauthenticated visitor instead of redirecting to `/login`; leave the authenticated branch completely unchanged (research.md #8) — depends on T007, T008, T009, T010

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - A logged-out visitor navigates to sign up, log in, or browse from the landing page (Priority: P2)

**Goal**: Every CTA (hero, nav, final section) correctly navigates to its existing route.

**Independent Test**: Select each CTA and confirm it reaches sign-up, log-in, or Browse correctly (quickstart.md Scenario 8).

### Tests for User Story 2

- [x] T012 [US2] Add the CTA-navigation scenario (hero "Get started"/"Browse games," nav "Log in"/"Sign up free," final CTA) to `e2e/landing-page.spec.ts` — depends on T006 (same file)

### Implementation for User Story 2

- [x] T013 [US2] Wire every CTA (`landing-hero.tsx`'s two buttons, the shared nav's "Log in"/"Sign up free," `landing-final-cta.tsx`'s button) to sign-up (`001`), log-in (`001`), and Browse (`004`) respectively — depends on T007, T010, T011

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - The floating hero card shows a real, live example posting (Priority: P3)

**Goal**: `applications.acceptedAt` is set correctly by Inbox's existing acceptance flow, backing the "parties formed this week" stat this page (and US1's hero card selection, already built) depend on.

**Independent Test**: Accept a pending application via Inbox and confirm `acceptedAt` is set and reflected in this page's stats on next load (quickstart.md Scenario 10).

### Tests for User Story 3

- [x] T014 [P] [US3] Integration test confirming `011`'s `accept-request.ts` now also sets `acceptedAt` alongside its existing `status = 'accepted'` write — extends `011`'s existing `accept-request.test.ts`
- [x] T015 [US3] Add the "parties formed this week" real-data verification scenario to `e2e/landing-page.spec.ts` — depends on T012 (same file)

### Implementation for User Story 3

- [x] T016 [US3] Amend `src/lib/actions/accept-request.ts` (`011-inbox-messaging`): set `acceptedAt = now()` alongside its existing `status` transition (research.md #3) — depends on T002

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 Confirm `next build` succeeds locally and CI stays green with the amended root route, the extended schema, and the amended `011` action
- [x] T018 Manually run quickstart.md Scenarios 1-10 end to end against local dev and confirm each passes
- [x] T019 [P] Update `docs/feature-list.md`, marking Landing page's spec/plan/tasks as complete — this is the 26th and final feature, closing the project-wide constitutional gate (v1.0.0): every tracked feature now has a complete spec/plan/tasks trio, and implementation may begin on any/all of them

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on US1's T007/T010/T011 (wires CTAs into components those tasks already built); T012 depends on US1's T006 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational (T002) only — independent of Phases 3-4, since it only touches `011`'s already-merged file; T015 depends on US2's T012 (same file).
- **Polish (Phase 6)**: Depends on all three user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/landing-page.spec.ts` (T006) accumulates scenarios across all three stories — same file, sequential.
- `src/app/page.tsx` (T011) is a single amendment touched once — no further sequential extension needed by later stories.

### Parallel Opportunities

- T005 can run alongside T004's dependents once T004 itself lands.
- User Story 3 (T014, T016) touches an entirely different file than User Stories 1-2 and can be done in parallel with them once Foundational (T002) is complete.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-3, 5-7
   independently
5. A logged-out visitor sees a real, honest marketing page at `/`,
   with Home's authenticated experience untouched — the smallest
   useful slice, and the one that matters most

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (CTA navigation)
4. User Story 3 → validate independently (`acceptedAt` wiring — can
   be done any time after Foundational, in parallel with US1/US2)
5. Polish → build/CI confirmation, quickstart run-through, doc update
   — **and the project-wide constitutional gate closes**: all 26
   features now have a complete spec/plan/tasks trio
