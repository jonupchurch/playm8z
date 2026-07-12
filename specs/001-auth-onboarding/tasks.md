---

description: "Task list for Auth & Onboarding implementation"
---

# Tasks: Auth & Onboarding

**Input**: Design documents from `/specs/001-auth-onboarding/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md (all present)

**Tests**: Included — plan.md's Constitution Check (Principle V) explicitly calls for unit tests on every new Zod schema, integration tests on the register/onboarding routes, and e2e coverage of the primary flows.

**Organization**: Tasks are grouped by user story (from spec.md) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1/US2/US3

## Path Conventions

Single Next.js project — `src/`, `e2e/` at repository root, per plan.md's Project Structure.

---

## Phase 1: Setup

**Purpose**: Minor project prep — no new runtime dependencies are needed (plan.md), so this phase is intentionally small.

- [ ] T001 [P] Add commented-out, optional `RESEND_API_KEY` and `EMAIL_FROM` entries to `.env.example`, noting the console-log fallback (research.md #1) so local/CI setup stays self-explanatory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schema, validation, and auth-config changes every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add `handle` (unique, not null), `avatarColor`, `region`, `platforms`, `ageGroup`, `vibe`, `playTimeSlots`, `gamesPlayed` columns to the `users` table in `src/db/schema.ts`, per data-model.md's field table
- [ ] T003 Generate and run the Drizzle migration for T002 (`npm run db:generate`, then `npm run db:migrate` against local Postgres) — depends on T002
- [ ] T004 [P] Add a `handleSchema` to `src/lib/validations/auth.ts` (`^[a-zA-Z][a-zA-Z0-9]{0,23}$`) alongside the existing `credentialsSchema`, per data-model.md's validation rules table
- [ ] T005 [P] Create `src/lib/validations/onboarding.ts` with per-field Zod schemas (avatarColor, region, platforms, ageGroup limited to `18`/`21`, vibe, playTimeSlots, gamesPlayed) and a combined partial-patch schema for `POST /api/onboarding`, per data-model.md
- [ ] T006 [P] Add a `profile()` callback to the Google provider in `src/auth.ts`, mapping Google's `email_verified` claim onto the adapter user's `emailVerified` field, per data-model.md
- [ ] T007 [P] Create `src/lib/email/send-verification-email.ts` exporting `sendVerificationEmail(user, token)`, console-logging the verification link when no email provider is configured, per research.md #1
- [ ] T008 [P] Create the shared tabbed `src/components/auth/auth-form.tsx` shell (Login/Sign up tabs, field styling per `resources/guidelines.md` §4.6 loading/pending/error patterns) — tab structure only, no submit handlers yet

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - New user signs up and completes onboarding (Priority: P1) 🎯 MVP

**Goal**: A visitor creates an account (Credentials or Google) and completes the 4-step onboarding wizard, landing on a completion screen.

**Independent Test**: Create a brand-new account end to end (either method) and confirm the resulting profile reflects everything entered during setup (quickstart.md Scenario 1).

### Tests for User Story 1

- [ ] T009 [P] [US1] Unit tests for `handleSchema` (format, boundary lengths, rejection cases) in `src/lib/validations/auth.test.ts`
- [ ] T010 [P] [US1] Unit tests for the onboarding field schemas in `src/lib/validations/onboarding.test.ts`
- [ ] T011 [P] [US1] Integration test for `POST /api/auth/register` (success; 409 on duplicate email; 409 on duplicate handle; 400s on bad format) in `src/app/api/auth/register/route.test.ts`
- [ ] T012 [P] [US1] Integration test for `POST /api/onboarding` (partial-patch persistence; 401 without a session) in `src/app/api/onboarding/route.test.ts`
- [ ] T013 [P] [US1] Playwright e2e spec for quickstart.md Scenario 1 (signup through completed onboarding), including an axe-core accessibility scan, in `e2e/signup-onboarding.spec.ts`

### Implementation for User Story 1

- [ ] T014 [P] [US1] Implement `GET /api/auth/check-handle` in `src/app/api/auth/check-handle/route.ts` (format + uniqueness check, `{ available, reason? }` response) — depends on T004
- [ ] T015 [P] [US1] Implement `POST /api/auth/register` in `src/app/api/auth/register/route.ts` (validate, hash password, create user row, create verificationToken row, call `sendVerificationEmail`) — depends on T004, T007
- [ ] T016 [P] [US1] Implement `GET /api/auth/verify-email` in `src/app/api/auth/verify-email/route.ts` (consume token, set `emailVerified`; 400/410 error handling)
- [ ] T017 [US1] Build the `/verify-email` confirmation page in `src/app/(auth)/verify-email/page.tsx` (success / expired-or-used states) — depends on T016
- [ ] T018 [P] [US1] Implement `POST /api/onboarding` in `src/app/api/onboarding/route.ts` (session-gated partial-patch persistence, echoes full profile per contracts/api.md) — depends on T005
- [ ] T019 [US1] Build the `/signup` page in `src/app/(auth)/signup/page.tsx` on the shared `auth-form.tsx`, wired to `POST /api/auth/register` and live `check-handle` — depends on T008, T014, T015
- [ ] T020 [US1] Build the onboarding wizard shell (progress bar, step routing) and Step 1 — Profile (display name, avatar color with live preview, handle fallback field for Google accounts without one) in `src/components/auth/onboarding-wizard.tsx` and `src/app/(auth)/onboarding/page.tsx` — depends on T014, T018
- [ ] T021 [US1] Add onboarding Step 2 — Games (multi-select chips spanning video games and tabletop/TTRPG) to `onboarding-wizard.tsx` — depends on T020
- [ ] T022 [US1] Add onboarding Step 3 — Where & how (region, optional platforms, age group limited to 18/21) to `onboarding-wizard.tsx` — depends on T021
- [ ] T023 [US1] Add onboarding Step 4 — Vibe (casual/serious/both, optional play-time slots) to `onboarding-wizard.tsx` — depends on T022
- [ ] T024 [US1] Add the onboarding completion screen (choices summary, "Start browsing" CTA to Home) to `onboarding-wizard.tsx` — depends on T023
- [ ] T025 [US1] Wire post-signup routing so every newly-created account (Credentials or Google) lands on `/onboarding` at Step 1 (FR-006), including the Google-without-handle case (research.md #2) — depends on T019, T024

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Returning user logs in (Priority: P2)

**Goal**: An existing user logs back in (Credentials or Google) and lands directly on Home — no onboarding repeats.

**Independent Test**: Log in with a previously-created account and confirm landing on Home immediately, with no onboarding steps shown (quickstart.md Scenario 3).

### Tests for User Story 2

- [ ] T026 [P] [US2] Integration test for the Credentials `authorize` callback in `src/auth.ts` (correct password succeeds; wrong password and unknown email fail identically) in `src/auth.test.ts`
- [ ] T027 [P] [US2] Playwright e2e spec for quickstart.md Scenario 3 (login lands on Home; wrong password shows a generic error) in `e2e/login.spec.ts`

### Implementation for User Story 2

- [ ] T028 [US2] Build the `/login` page's login tab in `src/app/(auth)/login/page.tsx` on the shared `auth-form.tsx`, calling Auth.js `signIn("credentials", ...)` and rendering the generic invalid-credentials error (FR-005) — depends on T008
- [ ] T029 [US2] Add the "Forgot password?" link (entry point only, no flow) to the login tab per FR-015 — depends on T028
- [ ] T030 [US2] Implement the shared post-authentication routing used by login, signup, and Google (returning users go straight to Home; only accounts that have never completed sign-up-time initialization go to `/onboarding`, FR-007) — depends on T025
- [ ] T031 [US2] Confirm Google sign-in for an already-linked account routes directly to Home via T030's routing logic, no handle prompt — depends on T030

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - New user skips onboarding (Priority: P3)

**Goal**: A newly-signed-up user chooses "Skip for now" partway through the wizard and still ends up with a working account.

**Independent Test**: Sign up, skip at any step, and confirm the account is fully functional (reaches Home, can log out and back in) despite incomplete profile data (quickstart.md Scenario 2).

### Tests for User Story 3

- [ ] T032 [P] [US3] Playwright e2e spec for quickstart.md Scenario 2 (skip at Step 1, reach Home, log out/in still works) in `e2e/skip-onboarding.spec.ts`

### Implementation for User Story 3

- [ ] T033 [US3] Add a "Skip for now" control to every step of `onboarding-wizard.tsx`, persisting only already-entered fields via the existing `POST /api/onboarding` partial-patch and routing straight to the completion screen (FR-012) — depends on T024
- [ ] T034 [US3] Verify no auto-resume/re-prompt of onboarding for a skipped-profile account on subsequent logins, against T030's routing logic (no separate onboarding-status field, per data-model.md's State notes) — depends on T030, T033

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T035 [P] Implement the reusable unverified-email write-action gate helper in `src/lib/auth/require-verified-email.ts` per research.md #3 and FR-014 — ready for future write-action features to call; no consuming route exists yet in this codebase
- [ ] T036 [P] Unit test for the gate helper (verified user passes; unverified user rejected with the FR-014 message) in `src/lib/auth/require-verified-email.test.ts` — depends on T035
- [ ] T037 Run an axe-core accessibility pass across `/login`, `/signup`, and all onboarding steps (Principle III, WCAG 2.1 AA) and fix any violations found — depends on T019-T024, T028
- [ ] T038 [P] Retire `e2e/smoke.spec.ts` now that `signup-onboarding.spec.ts` and `login.spec.ts` supersede it as real coverage
- [ ] T039 Manually run quickstart.md Scenarios 1-5 end to end against local dev and confirm each passes — depends on all prior phases
- [ ] T040 [P] Update `docs/feature-list.md`, marking Auth & Onboarding's spec/plan/tasks as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; T030 depends on US1's T025 (shares the post-auth routing decision point).
- **User Story 3 (Phase 5)**: Depends on Foundational and on US1's onboarding wizard (T020-T024) and US2's T030.
- **Polish (Phase 6)**: Depends on the user stories it touches (see per-task notes above).

### Within Each User Story

- Tests are written before implementation, and should fail until the corresponding route/page exists.
- `onboarding-wizard.tsx` tasks (T020-T024, T033) are sequential — same file.
- API routes within a story (T014-T018) are largely parallel — different files, no cross-dependency beyond Foundational.

### Parallel Opportunities

- All Foundational tasks marked [P] (T004-T008) can run together once T002/T003 land.
- US1's tests (T009-T013) can all run in parallel.
- US1's routes (T014, T015, T016, T018) can run in parallel; pages/wizard steps are sequential.
- US2's and US3's test tasks (T026, T027, T032) can run in parallel with each other.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently
5. This is the smallest useful slice — a new user can sign up and get a full profile

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently (MVP)
3. User Story 2 → validate independently (returning users can get back in)
4. User Story 3 → validate independently (skip path doesn't break anything)
5. Polish → accessibility pass, gate helper, doc updates
