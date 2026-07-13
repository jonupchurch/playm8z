---

description: "Task list for Error Pages implementation"
---

# Tasks: Error Pages

**Input**: Design documents from `/specs/002-error-pages/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — this feature has no fetch-based API surface, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the settings-read and role-gate helpers, plus e2e coverage (with axe-core scans) of the states that are actually reachable via a real URL today.

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3/US4

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [x] T001 Enable `experimental.authInterrupts` in `next.config.ts` (required for `forbidden()`/`unauthorized()`, research.md #1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared visual component, the settings-read path, and the role-gate helper every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add the `settings` table to `src/db/schema.ts` (`maintenanceMode` boolean not null default false, `maintenanceMessage` nullable text), per data-model.md
- [x] T003 Generate and run the Drizzle migration for T002, seeding the single default settings row (`maintenanceMode=false`, `maintenanceMessage=null`) so the table is never actually empty — depends on T002
- [x] T004 [P] Create `src/lib/settings/get-settings.ts` — a short-TTL-cached read of the settings row, Zod-validated before use (data-model.md) — depends on T002
- [x] T005 [P] Create the shared `src/components/errors/error-state.tsx` component with all four variants (not-found, server-error, access-denied, maintenance — the last accepting an optional message with a generic "back shortly" fallback), matching the wireframe's shared layout (logo, motif, code, title, message, two actions, footnote)
- [x] T006 [P] Create `src/lib/auth/require-role.ts` — calls `unauthorized()` when no session exists and `forbidden()` when the session's role is below a given minimum, ready for future gated pages (e.g. the not-yet-built `/admin/*`) to call

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Visitor hits a broken or missing link (Priority: P1) 🎯 MVP

**Goal**: Any nonexistent route renders the branded not-found page with a real 404 status.

**Independent Test**: Navigate to any nonexistent route and confirm the branded 404 page renders with working Home/Browse links (quickstart.md Scenario 1).

### Tests for User Story 1

- [x] T007 [P] [US1] Unit test for `error-state.tsx`'s not-found variant in `src/components/errors/error-state.test.tsx`
- [x] T008 [US1] Playwright e2e spec for the 404 scenario (real 404 status on the wire, working Home/Browse links, axe-core accessibility scan) — creates `e2e/error-pages.spec.ts`

### Implementation for User Story 1

- [x] T009 [US1] Build `app/not-found.tsx` using `error-state.tsx`'s not-found variant — depends on T005

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Unhandled server error occurs (Priority: P2)

**Goal**: An unhandled server error renders the branded server-error page with a real 500 status and a reference code, never a raw stack trace.

**Independent Test**: Trigger an unhandled error and confirm the branded 500 page renders with a reference code and a working "Try again" (quickstart.md Scenario 2).

### Tests for User Story 2

- [x] T010 [P] [US2] Unit test for `error-state.tsx`'s server-error variant (reference-code slot renders correctly) in `src/components/errors/error-state.test.tsx` — same file as T007
- [x] T011 [US2] Add the 500 scenario (real 500 status, visible reference code, no leaked internals, "Try again" re-renders the segment, axe-core scan) to `e2e/error-pages.spec.ts` — depends on T008 (same file)

### Implementation for User Story 2

- [x] T012 [US2] Build `app/error.tsx` (route-segment error boundary) using `error-state.tsx`'s server-error variant, displaying `error.digest` as the reference code and wiring "Try again" to `unstable_retry()` — depends on T005
- [x] T013 [US2] Build `app/global-error.tsx` (root-layout error boundary), mirroring T012 for failures `error.tsx` can't catch — depends on T005

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Visitor without sufficient access hits a gated page (Priority: P3)

**Goal**: A visitor lacking authentication or role sees the same branded access-denied page — 401 when not logged in, 403 when logged in but under-privileged.

**Independent Test**: Unit-level: `require-role.ts` calls the correct function for each case, and both special pages render identical content (quickstart.md Scenario 3). A live HTTP round-trip test is deferred — see Notes below.

### Tests for User Story 3

- [x] T014 [P] [US3] Unit tests for `require-role.ts` (no session → calls `unauthorized()`; insufficient role → calls `forbidden()`; sufficient role → returns normally), mocking `next/navigation`, in `src/lib/auth/require-role.test.ts`
- [x] T015 [P] [US3] Unit test for `error-state.tsx`'s access-denied variant, confirming the 401 and 403 cases render identical content, in `src/components/errors/error-state.test.tsx` — same file as T007/T010

### Implementation for User Story 3

- [x] T016 [US3] Build `app/forbidden.tsx` using `error-state.tsx`'s access-denied variant — depends on T005
- [x] T017 [US3] Build `app/unauthorized.tsx` using the same variant — depends on T005

**Checkpoint**: 404, 500, and 403/401 all independently functional.

**Note**: unlike 404/500, there's no real gated route in this codebase yet to drive a live e2e test of the 401/403 status round-trip — same situation Auth & Onboarding's write-gate helper was in. `require-role.ts` and both pages are fully built and unit-tested; live e2e coverage is deferred to whichever future feature builds the first real gated page (most likely Admin Dashboard), per research.md #3 and quickstart.md Scenario 3. Not a gap in this feature's scope.

---

## Phase 6: User Story 4 - Platform is placed into maintenance mode (Priority: P4)

**Goal**: While the maintenance flag is on, every non-admin route shows the branded maintenance page with a 503 status; `/admin/*` stays reachable.

**Independent Test**: With the flag set, confirm a non-admin route shows the maintenance page and `/admin/*` is not intercepted (quickstart.md Scenario 4).

### Tests for User Story 4

- [x] T018 [P] [US4] Unit tests for `get-settings.ts` (valid row passes; a malformed row is rejected by Zod; the generic message fallback applies when `maintenanceMessage` is null) in `src/lib/settings/get-settings.test.ts`
- [x] T019 [US4] Playwright e2e spec `e2e/maintenance.spec.ts`: with the flag set via a direct DB write in test setup, confirm a non-admin route renders the maintenance page with a 503 status, confirm an `/admin/*` path is not intercepted, confirm a configured message renders (and the generic fallback when absent), including an axe-core scan — depends on T004, T005

### Implementation for User Story 4

- [x] T020 [US4] Build `proxy.ts`: on every request, read the cached settings (T004); when `maintenanceMode` is true and the path doesn't start with `/admin`, render `error-state.tsx`'s maintenance variant with a 503 status — depends on T004, T005

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T021 Confirm `next build` succeeds locally and CI stays green with `experimental.authInterrupts` enabled and the new `proxy.ts` in place — a new experimental flag and a proxy touching every route is a real risk surface worth a direct check, not just trusting the dev server
- [x] T022 Manually run quickstart.md Scenarios 1-4 end to end against local dev and confirm each passes
- [x] T023 [P] Update `docs/feature-list.md`, marking Error Pages' spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; its e2e task (T011) depends on US1's T008 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational only — independent of US1/US2's e2e file.
- **User Story 4 (Phase 6)**: Depends on Foundational only (T004, T005).
- **Polish (Phase 7)**: Depends on all four user stories.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `error-state.tsx` (T005) and its test file (`error-state.test.tsx`, T007/T010/T015) are shared across US1/US2/US3 — the test file itself is additive (each story adds its own variant's test), so those test tasks are sequential relative to each other despite different variants.
- `e2e/error-pages.spec.ts` (T008/T011) is shared across US1/US2 — sequential for the same reason.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004-T006) can run together once T002/T003 land.
- US3's tests (T014, T015) and US4's test (T018) can run in parallel with each other and with US1/US2's work, since none share a file with US1/US2.
- US3's and US4's implementation tasks (T016, T017, T020) touch different files and can run in parallel once Foundational is done.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. Every visitor now gets a branded 404 instead of a framework default — the smallest useful slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (500 with reference code)
4. User Story 3 → validate independently (401/403, unit-level; e2e deferred per the Phase 5 note)
5. User Story 4 → validate independently (maintenance mode + `/admin/*` exemption)
6. Polish → build/CI confirmation, quickstart run-through, doc update
