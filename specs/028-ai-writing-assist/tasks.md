---

description: "Task list for Admin-Only AI Writing Assist (News & Content Pages)"
---

# Tasks: Admin-Only AI Writing Assist (News & Content Pages)

**Input**: Design documents from `/specs/028-ai-writing-assist/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md, `docs/adr/0007-ai-writing-assist-via-vercel-ai-gateway.md` (no data-model.md/contracts — none apply, see plan.md)

**Tests**: Included — Principle V requires coverage for every non-trivial feature, and this one has real business logic (input validation, prompt construction, role gating, audit logging) worth proving with the AI SDK mocked (research.md #7).

**Organization**: Two user stories (US1 "write from scratch," US2 "improve/rewrite"), each covering both admin surfaces (Admin News, the inline Content Page editor) within its own tasks, since the capability — not the surface — is what distinguishes the stories (matching spec.md's own structure).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (Setup/Foundational/Polish tasks have no story label)

---

## Phase 1: Setup

**Purpose**: External provisioning this feature genuinely needs before it can be exercised for real (not before it can be built/tested — Vitest mocks the AI SDK entirely, per research.md #7).

- [ ] T001 Provision `AI_GATEWAY_API_KEY` (Vercel AI Gateway, via the Marketplace or an API key from the Vercel dashboard), add it to `.env.local` (gitignored), and document it in `.env.example` with no real value.
- [ ] T002 [P] Confirm the `ai` package is installed (added during planning research — verify `package.json`/`package-lock.json` reflect it) and re-verify the current Claude Haiku alias via `GET https://ai-gateway.vercel.sh/v1/models` before hardcoding it in `src/lib/ai/gateway.ts` (research.md #1 — model IDs drift; `anthropic/claude-haiku-4.5` was current at plan time, re-check at implementation time).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure both user stories depend on — neither story's controls can render or call anything without this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [P] Create Zod schemas in `src/lib/validations/ai-writing-assist.ts`: the inbound "topic" input, the inbound "text to improve" input (both trimmed, non-empty, reasonable max length — research.md #4), the News draft output shape (`title`/`excerpt`/`body`), and the Content Page draft output shape (an array of the existing `ContentBlock` union).
- [ ] T004 [P] Create `src/lib/ai/gateway.ts`: the `anthropic/claude-haiku-4.5` model constant (research.md #1), a thin wrapper around `generateText` + `Output.object()` for structured drafts, and a thin wrapper around plain `generateText` for "improve/rewrite" (research.md #2/#3 — this SDK version has no `generateObject`).
- [ ] T005 [P] In `src/app/admin/news/page.tsx`, resolve `getCurrentRole()` (already exported from `require-role.ts`) alongside the existing `requireRole("moderator")` call, and pass `isAdmin={role === "admin"}` into `NewsPostEditor`.
- [ ] T006 [P] In `src/app/pages/[slug]/page.tsx`, resolve `getCurrentRole()` alongside the existing `canEditPage()` check, and pass `isAdmin={role === "admin"}` into `PageEditor` (only reached when `canEdit` is already true) — this is the real inline-edit surface for Content Pages, not anything under `/admin/content-pages/` (plan.md's Structure Decision).

**Checkpoint**: Foundation ready — both user stories can now be implemented.

---

## Phase 3: User Story 1 - Generate a first draft from a short topic (Priority: P1) 🎯 MVP

**Goal**: An admin can turn a short topic into a complete, editable draft on either surface via "Write from scratch."

**Independent Test**: As a seeded admin, enter a topic on a blank News post or blank Content Page and confirm a full draft populates the existing, still-editable form fields; confirm a seeded moderator never sees the control.

### Tests for User Story 1 ⚠️

> Write these first; confirm they fail (nothing exists yet) before implementing.

- [ ] T007 [P] [US1] Vitest for `generate-news-draft.ts` in `src/lib/actions/generate-news-draft.test.ts`: `vi.mock("ai")` so no real network call is made; assert an `admin`-role session succeeds and returns a validated `{ title, excerpt, body }`; assert a real seeded `moderator` session is rejected (no mocking of the gate itself, matching 024's own precedent); assert an empty/oversized topic is rejected by Zod before any AI call; assert `logAuditEntry()` is called with `category: "content"`.
- [ ] T008 [P] [US1] Vitest for `generate-content-page-draft.ts` in `src/lib/actions/generate-content-page-draft.test.ts`: same shape as T007, asserting a validated `{ blocks: ContentBlock[] }` output.
- [ ] T009 [US1] Extend `e2e/admin-news.spec.ts`: a real seeded `admin` session sees a "Write from scratch" control on the News editor; a real seeded `moderator` session does not (control absent, not just disabled) — gate/visibility only, no click-through to a real AI response (research.md #7).
- [ ] T010 [US1] Extend `e2e/content-page.spec.ts`: same as T009, for the inline Content Page block editor at a real `/pages/<slug>` URL.

### Implementation for User Story 1

- [ ] T011 [US1] Implement `src/lib/actions/generate-news-draft.ts`: `requireRole("admin")`, validate the topic (T003's schema), call T004's structured-draft wrapper with the News schema, call `logAuditEntry()`, return the draft. Confirm T007 passes.
- [ ] T012 [US1] Implement `src/lib/actions/generate-content-page-draft.ts`: same pattern as T011 with the Content Page blocks schema. Confirm T008 passes.
- [ ] T013 [US1] In `src/components/admin/news-post-editor.tsx`: accept the new `isAdmin` prop; add a topic input + "Write from scratch" button (visible only when `isAdmin`), a clear in-progress state while the request runs, an error state that leaves the current title/excerpt/body untouched on failure (FR-006), and on success populate all three fields via the component's existing `setTitle`/`setExcerpt`/`setBody`. Confirm T009 passes.
- [ ] T014 [US1] In `src/components/content-page/page-editor.tsx`: accept the new `isAdmin` prop; add the same topic input + "Write from scratch" button, populating a fresh block list via the editor's existing draft-block state (add/remove/reorder/edit still work on the result exactly like manually-added blocks). Confirm T010 passes.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Improve or rewrite existing draft text (Priority: P2)

**Goal**: An admin can revise their own already-drafted text (the News body, or one Content Page block) in place.

**Independent Test**: With existing drafted text on either surface, use "Improve/rewrite" and confirm only that field/block changes; confirm the control is unavailable on an empty field, and absent entirely for a moderator.

### Tests for User Story 2 ⚠️

- [ ] T015 [P] [US2] Vitest for `improve-draft-text.ts` in `src/lib/actions/improve-draft-text.test.ts`: `vi.mock("ai")`; assert an `admin` session succeeds and returns a revised string via plain `generateText` (no `Output.object()`); assert a real seeded `moderator` session is rejected; assert empty/oversized input is rejected by Zod; assert `logAuditEntry()` is called with `meta.surface` reflecting whichever caller invoked it (proving the action is genuinely surface-agnostic, research.md #3).
- [ ] T016 [US2] Extend `e2e/admin-news.spec.ts`: an admin sees "Improve/rewrite" once the body has text, and it's unavailable when the body is empty; a moderator never sees it.
- [ ] T017 [US2] Extend `e2e/content-page.spec.ts`: same as T016, per selected block on the inline editor.

### Implementation for User Story 2

- [ ] T018 [US2] Implement `src/lib/actions/improve-draft-text.ts`: `requireRole("admin")`, validate the input text (T003's schema), call T004's plain-text wrapper, call `logAuditEntry()` with a `surface` tag the caller passes in, return the revised string. Confirm T015 passes.
- [ ] T019 [US2] In `news-post-editor.tsx`: add an "Improve/rewrite" control next to the body field (visible only when `isAdmin` and the body is non-empty), same in-progress/error-preserves-draft behavior as T013, replacing only `body` on success. Confirm T016 passes.
- [ ] T020 [US2] In `page-editor.tsx`: add a per-block "Improve/rewrite" control (visible only when `isAdmin` and that block's `blockToText()` is non-empty), converting the selected block via `blockToText()`, calling T018, and applying the result via the existing `withText()` helper. Confirm T017 passes.

**Checkpoint**: User Stories 1 and 2 are both independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T021 [P] Add entry 28 to `docs/feature-list.md` (this project's per-feature tracking convention).
- [ ] T022 [P] Update `CHANGELOG.md` and `status.md` per Principle VI.
- [ ] T023 Run `quickstart.md`'s manual validation steps against a running dev server with a real, provisioned `AI_GATEWAY_API_KEY` (T001) — confirm both actions genuinely work end-to-end, not just the mocked test paths.
- [ ] T024 Run `npm run typecheck && npm run lint && npm test && npm run test:e2e` — all green before merge, per Principle V / CI (`.github/workflows/ci.yml`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001/T002 can start immediately (and don't block Foundational/US1 building, only T023's real end-to-end pass).
- **Foundational (Phase 2)**: T003–T006 have no dependencies on each other (different files) — BLOCKS both user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends on Foundational only — not on User Story 1 (the shared `improve-draft-text.ts` action doesn't need US1's generate actions to exist). Sequenced after US1 here for incremental delivery, not because of a real dependency.
- **Polish (Phase 5)**: Depends on both user stories being complete; T023 additionally depends on T001.

### Within Each User Story

- Tests (T007–T010, T015–T017) MUST be written and confirmed failing before their corresponding implementation tasks.
- Server Action before its UI consumer (e.g. T011 before T013).

### Parallel Opportunities

- T003–T006 (Foundational, all different files).
- T007/T008 (different new test files); T009/T010 (different e2e files, though both extend existing suites).
- T015 alongside T007/T008 if US1 and US2 are staffed simultaneously (no real dependency between the stories) — sequential is also fine for solo work.
- T021/T022 (different files).

## Parallel Example: Foundational Phase

```bash
Task: "Create Zod schemas in src/lib/validations/ai-writing-assist.ts"
Task: "Create src/lib/ai/gateway.ts shared AI Gateway wrapper"
Task: "Add isAdmin plumbing to src/app/admin/news/page.tsx"
Task: "Add isAdmin plumbing to src/app/pages/[slug]/page.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup (T001–T002) and Foundational (T003–T006).
2. Complete User Story 1 (T007–T014) — "Write from scratch" alone is a real, demoable MVP.
3. **STOP and VALIDATE**: run T009/T010 e2e plus a manual pass.
4. Add User Story 2 (T015–T020) as the next increment.
5. Polish (T021–T024) closes it out.
