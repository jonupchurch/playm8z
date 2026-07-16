---

description: "Task list for Admin-editable Genres"
---

# Tasks: Admin-editable Genres

**Input**: Design documents from `/specs/030-admin-genres/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (no contracts/ — Server Actions are this project's internal-RPC pattern, see plan.md)

**Tests**: Included — Principle V. This feature has real logic worth proving: the guardrail rules, and above all the create-strict/edit-tolerant membership split (research.md #4), which is the thing most likely to be got wrong.

**Organization**: By user story. US1 (an admin curates the list) and US2 (removal never damages a posting) are both P1 and ship together — US2 is not a follow-up, it is the safety half of the same change, live from the first removal.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Setup/Foundational/Polish tasks have no story label

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The stored list must exist and be readable before anything can consume it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Add `genres: text("genres").array().notNull().default([...])` to the `settings` table in `src/db/schema.ts` (~line 115, beside `bannedPhrases`). Default is exactly today's eight genres (data-model.md). Apply with `drizzle-kit push` and verify the column landed by querying `information_schema` directly — `db:migrate` has silently no-op'd on every schema-changing feature in this project.
- [ ] T002 Rename `GENRES` → `DEFAULT_GENRES` in `src/lib/validations/browse-filters.ts:3-12` and update its comment to say it is the column default/seed **only** and is not read at request time (research.md #2). Fix the resulting import breaks in `posting.ts`, `post-game-form.tsx`, `filter-sidebar.tsx`, and `get-landing-stats.ts` — they are replaced properly in later phases; this task only keeps the tree compiling.
- [ ] T003 Extend the settings read in `src/lib/settings/get-settings.ts` to include and Zod-validate `genres`, adding it to that module's `DEFAULTS` fallback so a parse failure degrades to today's list rather than an empty one.
- [ ] T004 **Grep every file that inserts into `settings`** (tests, fixtures, scripts — not just the ones named in this plan) and confirm none break now that the row carries a new NOT NULL column. A new column with a meaningful default has silently broken unrelated seed scripts in this project before.

**Checkpoint**: The list is stored, defaulted, and readable.

---

## Phase 2: User Story 1 — An admin curates the genre list (Priority: P1) 🎯 MVP

**Goal**: An admin adds/removes a genre; post-a-game and Browse both reflect it, and can never disagree.

**Independent Test**: quickstart.md Scenario 1 — add `Racing` as admin, then see it offered on **both** `/post` and `/browse`.

- [ ] T005 [US1] Add `saveListsSettingsSchema` to `src/lib/validations/admin-settings.ts`: `genres` is an array of trimmed, non-empty strings, min length 1 (FR-010), max ~50 chars each, with a `.refine()` rejecting case-insensitive duplicates (FR-011). Casing is preserved as typed — the comparison lowercases, the stored value never does (FR-014).
- [ ] T006 [US1] Create `src/lib/actions/save-lists-settings.ts` following `save-moderation-settings.ts` exactly: `requireRole("admin")` (FR-012) → `safeParse` → `upsertSettings()` → `logAuditEntry()` (FR-013, category `content`) → `revalidatePath("/admin/settings","layout")`. Must go through `upsertSettings` — it is what calls `invalidateSettingsCache()`; `revalidatePath` alone does not touch that in-memory cache (research.md #7).
- [ ] T007 [US1] Create `src/components/admin/settings-lists.tsx` — the Lists tab, reusing the add/remove chip pattern from `settings-moderation.tsx:31,47-53`. Each remove button needs an accessible name naming **which** genre it removes (eight identical "Remove" buttons is the failure mode). Use `text-muted`, not `text-dim`, on the accent-tinted background — that combination has failed axe here before.
- [ ] T008 [US1] Register the Lists tab in `src/components/admin/settings-shell.tsx` and render it from `src/app/admin/settings/page.tsx`, reading `genres` from settings and passing it in.
- [ ] T009 [P] [US1] `src/app/post/page.tsx` reads the stored list and passes it to `post-game-form.tsx` as a prop; the form drops its `GENRES` import and renders the prop (FR-005). **Prop, not import** — a client component importing a runtime value from a module reaching `@/db` crashes the page (research.md #9).
- [ ] T010 [P] [US1] `src/app/browse/page.tsx` reads the stored list and passes it to `filter-sidebar.tsx` as a prop; the sidebar drops its `GENRES` import (FR-005).
- [ ] T011 [US1] Vitest for `save-lists-settings.ts`: an admin save persists; a moderator is rejected (FR-012); an audit entry is written (FR-013). **`settings` is a shared singleton row** — restore every field in `afterAll`/`finally`, not just on the success path, or it leaks into whichever test file runs next.

**Checkpoint**: The core promise works end-to-end.

---

## Phase 3: User Story 2 — Removing a genre never damages existing postings (Priority: P1)

**Goal**: Retiring a genre stops it being offered, and touches nothing that already exists.

**Independent Test**: quickstart.md Scenarios 2–4.

- [ ] T012 [US2] `src/lib/validations/posting.ts:29` — `genre` becomes shape-only: `z.preprocess(emptyToUndefined, z.string().trim().max(50).optional())`. Membership is no longer expressible as a static enum and moves to the actions (research.md #3). Leave a comment saying so, or the next reader will "restore" the enum and silently re-freeze the list.
- [ ] T013 [US2] `src/lib/actions/create-posting.ts:31` — after `safeParse`, reject a genre that is present and not in the stored list (FR-008), with a readable error.
- [ ] T014 [US2] `src/lib/actions/manage-posting.ts:35` — reject only when the submitted genre is **both** absent from the stored list **and** different from the posting's currently stored genre (research.md #4). The posting is already loaded for the ownership check, so its current genre is in hand — no extra query. **Applying T013's rule here strands every host whose genre was retired**; that is the single most likely way to break this feature.
- [ ] T015 [US2] `src/lib/validations/browse-filters.ts:35` — `genres` becomes `z.preprocess(toArray, z.array(z.string().max(50)).max(8)).catch([])`; then in `src/app/browse/page.tsx`, intersect the parsed genres against the stored list before calling `searchPostings` (research.md #5). Do **not** pass unknown values through to the query — `inArray` would match nothing and show an empty Browse, which reads as "nothing here" rather than "filter ignored" (US2 sc.4). Note this deliberately changes today's behaviour, where one unknown genre discards the *whole* genre filter.
- [ ] T016 [P] [US2] Vitest for `create-posting`: an unlisted genre is rejected; a listed one is accepted; an absent genre is accepted (it is optional).
- [ ] T017 [US2] Vitest for `manage-posting`: **re-saving a posting whose stored genre has been retired succeeds and keeps that genre** (US2 sc.5); switching *to* a retired genre is rejected; switching to a listed genre succeeds. This is the test that protects T014's rule.

**Checkpoint**: Removal is safe. US1 + US2 together are the shippable feature.

---

## Phase 4: User Story 3 — The list cannot be corrupted (Priority: P2)

**Goal**: Guardrails hold and are proven.

**Independent Test**: quickstart.md Scenario 5.

- [ ] T018 [P] [US3] Vitest for `saveListsSettingsSchema`: empty list rejected (FR-010); blank/whitespace entry rejected; `fps` vs `FPS` rejected as duplicate (FR-011); `Co-op PvE` and `TTRPG` round-trip with casing and punctuation intact (FR-014).
- [ ] T019 [US3] Playwright e2e (`e2e/admin-genres.spec.ts`): as a real seeded admin, add a genre → assert it appears on **both** `/post` and `/browse` (SC-003); remove it → assert it is gone from both **and** that a posting already tagged with it still displays it (SC-004). Seed the posting directly. Restore `settings.genres` in `afterAll` **unconditionally**. Assert on the DB only after an observable UI success signal — `.click()` only awaits the event dispatch, not the Server Action behind it.

---

## Phase 5: Polish

- [ ] T020 [P] `src/lib/landing/get-landing-stats.ts:5,88` — count over the stored list rather than the const (FR-006).
- [ ] T021 [P] Update `CHANGELOG.md`, `status.md`, and `docs/feature-list.md` (entry 30).
- [ ] T022 Run the full suite (`npm test`, `npm run test:e2e`) and **check the reporter's test count against `npx playwright test --list`** — a local e2e run has silently under-run in this project and reported green on a suite that skipped ~31 tests.
- [ ] T023 Walk quickstart.md by hand, driving the real app. Scenarios 2 and 3 (removal safety, retired-genre re-save) are the ones that matter most and the ones automated tests are most likely to have got subtly wrong.

---

## Dependencies

- **Phase 1 blocks everything.**
- T005 → T006 → {T007, T008}; T009/T010 depend on T003 only.
- T012 blocks T013/T014/T015.
- T019 depends on Phases 2 and 3 being complete.
- **US1 and US2 ship together** — do not merge US1 alone. Between them, an admin can remove a genre with no rule protecting existing postings, which is the destructive state the feature must never have.
