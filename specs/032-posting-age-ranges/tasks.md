---

description: "Task list for Posting age groups become demographic ranges"
---

# Tasks: Posting age groups become demographic ranges

**Input**: Design documents from `/specs/032-posting-age-ranges/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, `docs/adr/0009-posting-age-group-is-a-demographic-range.md` (no contracts/ — Server Actions are this project's internal-RPC pattern, see plan.md)

**Tests**: Included — Principle V. Two things here fail silently and must be pinned by tests: the display label (which renders `50plus+` with nothing erroring), and the legacy-value paths (which no UI can produce any more, so they will regress unnoticed).

**Organization**: By user story. All three are P1 and ship together — US2 (no enforcement) and US3 (old postings survive) are not follow-ups, they are the properties that make US1 safe.

**Independent of 030/031.** Shared files are `posting.ts` and `browse-filters.ts` — 030 edits their **genre** fields, this edits their **ageGroup** fields. Whichever merges second should expect a trivial textual conflict there and nothing more.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Setup/Foundational/Polish tasks have no story label

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The vocabulary and its display. **No schema change and no migration** — `postings.ageGroup` is already free text (data-model.md).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Create `src/lib/postings/age-label.ts` exporting the vocabulary and `postingAgeLabel(value: string): string`:
      `any`→"Any", `18-29`→"18-29", `30-49`→"30-49", `50plus`→"50+", **plus the legacy `18`→"18+" and `21`→"21+"** (FR-012), and an unknown value returning the raw string rather than throwing (FR-009).
      **The token is `50plus`, never `50+`**: the browse filter travels in a URL query string where `+` decodes to a space, so a stored `50+` arrives as `"50 "` — a bug that appears only in a real browser and never in a test (research.md #1).
- [ ] T002 [P] Unit-test `postingAgeLabel` (`age-label.test.ts`): all four current tokens, **both legacy tokens**, and an unknown value. The legacy cases are the ones most likely to be dropped from the tests and most likely to regress, since no UI produces them any more.
- [ ] T003 Update the comment on `src/db/schema.ts:172` — `// 18|21 only (ADR 0002) -- never 13.` becomes false the moment this ships. Point it at ADR 0009. A stale comment asserting a superseded ADR is worse than none.

**Checkpoint**: The vocabulary and its labels exist and are proven.

---

## Phase 2: User Story 1 — A host says who their party is for (Priority: P1) 🎯 MVP

**Goal**: A host tags a party `Any`/`18-29`/`30-49`/`50+`; a player finds it by filtering for exactly that; the label renders correctly everywhere.

**Independent Test**: quickstart.md Scenarios 1–3.

- [ ] T004 [US1] `src/lib/validations/posting.ts:36` — `ageGroup: z.enum(["18","21"]).default("18")` becomes `z.enum(["any","18-29","30-49","50plus"]).default("any")` (FR-001, FR-015). The default is `any`, so a host who ignores the field claims nothing (SC-007).
- [ ] T005 [US1] `src/lib/validations/browse-filters.ts:38` — `ageGroup: z.enum(["any","18","21"]).catch("any")` becomes `z.enum(["any","18-29","30-49","50plus"]).catch("any")` (FR-005). `.catch("any")` already gives FR-009's graceful handling of a stale bookmark for free — keep it.
- [ ] T006 [P] [US1] `src/components/post-game/post-game-form.tsx:164,399-400` — the `useState<"18"|"21">` becomes the new union defaulting to `"any"`, and the two `<Segment>`s become four. Check the row still fits at mobile width — there were two, there are now four.
- [ ] T007 [P] [US1] `src/components/browse/filter-sidebar.tsx:129,221-223` — three segments become four (`Any`, `18-29`, `30-49`, `50+`), labels via `postingAgeLabel`.
- [ ] T008 [P] [US1] `src/app/listing/[id]/page.tsx:244` — replace `{posting.ageGroup}+` with `postingAgeLabel(posting.ageGroup)` (FR-004). Check the age tile still lines up with its neighbours now its content can be five characters (`30-49`) instead of three.
- [ ] T009 [P] [US1] `src/components/browse/active-pills.tsx:62` — replace `` `${ageGroup}+` `` with `postingAgeLabel(ageGroup)` (FR-007).
- [ ] T010 [US1] **Do not change `src/lib/postings/search-postings.ts:71`.** It already skips the WHERE clause when the filter is `any` and otherwise does an exact `eq` — which is exactly FR-006 and FR-016. A posting tagged `any` therefore surfaces only when no age filter is applied; being findable by age is opt-in. This task is a deliberate no-op with a comment: treating filter-`any` as "match tag `any`" hides every open party from an unfiltered Browse, and treating tag-`any` as a wildcard makes the filter meaningless (research.md #3).
- [ ] T011 [P] [US1] Vitest for `postingSchema.ageGroup`: the four tokens accepted; `18`/`21` rejected (FR-003, FR-008); nonsense rejected; omitting the field yields `any` (FR-015).

**Checkpoint**: The core promise works.

---

## Phase 3: User Story 3 — Existing postings survive (Priority: P1)

**Goal**: An old `18`/`21` posting displays legibly and is never relabelled — including implicitly.

**Independent Test**: quickstart.md Scenario 4 — the silent-relabel trap.

- [ ] T012 [US3] `src/components/profile/posting-management-card.tsx:229` — replace the two hardcoded `<option>`s with the four new ones, **and** add the legacy-option rule: when the posting's stored `ageGroup` is not one of the four, render an **additional** `<option>` carrying that stored value with its legacy label (e.g. `21+`), preselected (research.md #5).
      **Why this is not optional**: a `<select>` whose `value` matches no `<option>` makes the browser select the *first* one. Without this, a host opening an old `21` posting to fix a typo would find the control showing `Any`, and saving would silently relabel their posting — a direct FR-011 violation, with nothing erroring.
- [ ] T013 [US3] `src/lib/actions/manage-posting.ts:35` — accept the posting's **currently stored** `ageGroup` even when it is a legacy value, rejecting every other out-of-vocabulary value (research.md #4). The posting is already loaded for the ownership check, so the current value is in hand. Accepts exactly one extra value: the one that row already holds.
- [ ] T014 [US3] Vitest for `manage-posting`: **re-saving a `21`-tagged posting unchanged succeeds and keeps `21`** (US3 sc.5); changing it to `30-49` succeeds; changing it *to* `21` from something else is rejected; `create-posting` rejects `21` outright (FR-008).
- [ ] T015 [US3] Playwright e2e (`e2e/posting-age-ranges.spec.ts`): seed a posting with `ageGroup = "21"` directly (no UI can produce one), then as its host edit **only the title** and save → the save succeeds and the posting still displays `21+`, with the row unchanged in the DB. Assert on the DB only after an observable UI success signal — `.click()` only awaits the event dispatch, not the Server Action.
- [ ] T016 [P] [US3] e2e: a posting tagged `50plus` renders **`50+`** on its detail page — not `50plus`, `50plus+`, or `50++` (SC-002). This is the defect that ships silently; assert the rendered string on a real page.

---

## Phase 4: User Story 2 — The tag describes, it does not gate (Priority: P1)

**Goal**: Prove the absence of enforcement.

**Independent Test**: quickstart.md Scenario 7.

- [ ] T017 [US2] **Grep `ageGroup` across `src/` and confirm it appears in exactly two kinds of place**: display, and the Browse WHERE clause. It must appear in **no** join/apply/accept path (FR-010, research.md #7). This task is an audit, not a change — renaming the options from a minimum age to a description of who a party is for makes adding a gate sound natural, and the platform has no verified ages to gate on.
- [ ] T018 [US2] e2e: a player whose own profile tag is `18+` can view **and apply to join** a posting tagged `50plus`, with no block and no warning (SC-003).

---

## Phase 5: Guarding the untouched half (FR-013)

- [ ] T019 [P] **Confirm untouched**: `src/lib/validations/onboarding.ts:32-35,58,75`, `src/components/auth/onboarding-wizard.tsx:399-401`, `src/app/profile/page.tsx:101`, `src/app/u/[handle]/page.tsx:123`, `src/db/schema.ts:33`. The user's own tag stays `18|21`, and those two profile sites keep concatenating `+` — `18`→`18+` is still correct **there** (research.md #6). Do not "unify" them with `postingAgeLabel`.
- [ ] T020 [P] e2e or manual: onboarding's age step still offers exactly `18+`/`21+`, and both profile surfaces still render the user's tag correctly (SC-006, quickstart Scenario 8).

---

## Phase 6: Polish

- [ ] T021 [P] Commit `docs/adr/0009-posting-age-group-is-a-demographic-range.md` and the pointer added to `docs/adr/0002-minimum-age-18-plus.md`. **Not paperwork**: ADR 0002 read alone says `ageGroup` is `18|21` "wherever `ageGroup` appears (User and Posting)" — a future reader who finds `30-49` in the database and 0002 in the docs will conclude the code is wrong and "fix" it.
- [ ] T022 [P] Update `CHANGELOG.md`, `status.md`, and `docs/feature-list.md` (entry 32).
- [ ] T023 Run the full suite (`npm test`, `npm run test:e2e`) and **check the reporter's count against `npx playwright test --list`** — a local e2e run has silently under-run here and reported green while skipping ~31 tests.
- [ ] T024 Walk quickstart.md by hand. Scenario 1 (does it really say `50+`?) and Scenario 4 (does an old posting survive an unrelated edit?) are the two that automated tests are most likely to have got subtly wrong.

---

## Dependencies

- **Phase 1 blocks everything** — every later phase uses `postingAgeLabel`.
- T004 blocks T011/T014; T005 blocks T007.
- T006–T009 are parallel (different files).
- T012 and T013 are a pair: the form offers the legacy value, the action accepts it. **Either alone is broken** — the form without the action fails the save; the action without the form silently relabels.
- **All three stories ship together.** US1 alone renames the options while old postings can still be silently relabelled (US3) and while nothing proves the tag isn't a gate (US2).
