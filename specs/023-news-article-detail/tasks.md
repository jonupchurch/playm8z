---

description: "Task list for News Article detail implementation"
---

# Tasks: News Article detail

**Input**: Design documents from `/specs/023-news-article-detail/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no contracts/ — every write is a Server Action, per plan.md)

**Tests**: Included — plan.md's Constitution Check (Principle V) calls for unit tests on the computed read-time/is-live/related logic, plus integration and e2e coverage (with axe-core).

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

- [ ] T001 Confirm `src/lib/auth/require-verified-email.ts` (`001`), News feed's (`013`) `subscribe-newsletter.ts`/search query, `010`'s `likes` table, and Profile's (`007`) Saved tab exist in the codebase before starting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema additions, the markdown-rendering dependency, validation schemas, and the public page shell every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add `newsPosts.slug` and the new `savedNewsPosts` table in `src/db/schema.ts`; document `likes.targetType`'s new `newsPost` value (data-model.md)
- [ ] T003 Generate and run the Drizzle migration for T002 — depends on T002
- [ ] T004 [P] Add the markdown-to-HTML rendering dependency (research.md #1)
- [ ] T005 [P] Create `src/lib/validations/news-article.ts` — Zod schemas for like/save (data-model.md)
- [ ] T006 Build `src/app/news/[slug]/page.tsx` shell (public route, not-found handling for a non-live/nonexistent slug) — depends on T002

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Any visitor reads a news article (Priority: P1) 🎯 MVP

**Goal**: An accurate, publicly-readable article page with a computed read time, reading-progress bar, and working newsletter subscribe box.

**Independent Test**: Confirm accurate rendering and correct not-found handling as a logged-out visitor (quickstart.md Scenario 1-4).

### Tests for User Story 1

- [ ] T007 [P] [US1] Unit tests for `get-news-article.ts` (computed read time, "is live" gate, "keep reading" query shape) in `src/lib/news/get-news-article.test.ts`
- [ ] T008 [US1] Playwright e2e covering the article view, not-found handling, the reading-progress bar, and the subscribe box, including an axe-core scan — creates `e2e/news-article-detail.spec.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Build `src/lib/news/get-news-article.ts` (article + computed read time + like/save state + related articles — research.md #2, #3, #6) — depends on T002, T005
- [ ] T010 [US1] Build `src/components/news/article-header.tsx`, `article-body.tsx` (markdown rendering — depends on T004), and `reading-progress.tsx` (client-only, `aria-hidden`) — depends on T009
- [ ] T011 [US1] Wire all three into `src/app/news/[slug]/page.tsx`, including not-found handling and the newsletter subscribe box (reusing `013`'s existing action) — depends on T006, T010

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - An authenticated visitor likes or saves an article (Priority: P2)

**Goal**: Like (reusing `010`'s polymorphic table) and Save (new `savedNewsPosts`, surfaced in Profile's Saved tab).

**Independent Test**: Like/unlike and confirm persisted state; save an article and confirm it appears in Profile's Saved tab (quickstart.md Scenario 5-6, 9).

### Tests for User Story 2

- [ ] T012 [P] [US2] Integration test for `toggle-news-like.ts` (create/delete against `likes` with `targetType = 'newsPost'`; unauthenticated/unverified rejection) in `src/lib/actions/toggle-news-like.test.ts`
- [ ] T013 [P] [US2] Integration test for `toggle-saved-news-post.ts` (create/delete; unauthenticated/unverified rejection) in `src/lib/actions/toggle-saved-news-post.test.ts`
- [ ] T014 [US2] Add the like/save scenario to `e2e/news-article-detail.spec.ts` — depends on T008 (same file)

### Implementation for User Story 2

- [ ] T015 [US2] Build `src/lib/actions/toggle-news-like.ts` — depends on T005
- [ ] T016 [US2] Build `src/lib/actions/toggle-saved-news-post.ts` — depends on T005
- [ ] T017 [US2] Wire Like/Save controls into `article-header.tsx` — depends on T010, T015, T016
- [ ] T018 [US2] Amend Profile's (`007`) Saved tab: add a "Saved articles" section reading from `savedNewsPosts` — depends on T002

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - A visitor discovers more content via related articles or shares the piece (Priority: P3)

**Goal**: A "Keep reading" grid (reusing `013`'s query) and client-only share buttons.

**Independent Test**: Confirm the related-articles grid and each share button's plain client-side behavior (quickstart.md Scenario 7-8).

### Tests for User Story 3

- [ ] T019 [US3] Add the "Keep reading" and share-buttons scenarios to `e2e/news-article-detail.spec.ts` — depends on T014 (same file)

### Implementation for User Story 3

- [ ] T020 [US3] Build `src/components/news/article-related.tsx` (reuses `013`'s existing list-query shape — research.md #6) — depends on T009
- [ ] T021 [US3] Wire share buttons (share-intent links, clipboard copy — no backend) into `article-header.tsx` — depends on T010
- [ ] T022 [US3] Wire `article-related.tsx` into `page.tsx` — depends on T011, T020

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Cross-Feature Amendments (bounded — research.md #2)

**Purpose**: Small, single-purpose additions to `020`'s and `013`'s already-merged files. Independent of Phases 3-5 (only needs T002 from Foundational).

- [ ] T023 [P] Amend `src/lib/actions/save-news-post.ts` (`020-admin-news`): generate a unique, collision-safe slug from the title at creation only — depends on T002
- [ ] T024 [P] Amend News feed's (`013-news-feed`) card component: link each card to `/news/{slug}` — depends on T002
- [ ] T025 [P] Extend `020`'s `save-news-post.test.ts` to cover T023's new behavior — depends on T023

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T026 Confirm `next build` succeeds locally and CI stays green with the new public route, two Server Actions, the extended schema, and the amended `013`/`020`/`007` files
- [ ] T027 Manually run quickstart.md Scenarios 1-10 end to end against local dev and confirm each passes
- [ ] T028 [P] Update `docs/feature-list.md`, marking News Article detail's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and US1's T010 (extends the same header component); T014 depends on US1's T008 (same file).
- **User Story 3 (Phase 5)**: Depends on Foundational and US1's T009/T010/T011; T019 depends on US2's T014 (same file).
- **Cross-Feature Amendments (Phase 6)**: Depends on Foundational (T002) only — independent of Phases 3-5.
- **Polish (Phase 7)**: Depends on all three user stories and Phase 6.

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding file exists.
- `e2e/news-article-detail.spec.ts` (T008) accumulates scenarios across all three stories — same file, sequential.
- `src/components/news/article-header.tsx` (T010) is extended by US2 (T017) and US3 (T021) — same file, sequential.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004, T005) can run once T002/T003 land.
- Phase 6's three amendment tasks (T023-T025) touch different already-merged features' files, are independent of Phases 3-5, and can run in parallel with any of them once T002 lands.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-4 independently
5. Any visitor can read a fully-rendered article with an accurate
   read time and correct not-found handling — the smallest useful
   slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (Like/Save, incl. Profile's
   Saved-tab amendment)
4. User Story 3 → validate independently (Keep reading, share)
5. Cross-Feature Amendments (Phase 6) → can be done any time after
   Foundational, validated via the extended `020` test file
6. Polish → build/CI confirmation, quickstart run-through, doc update
