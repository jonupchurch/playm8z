# Tasks: Enforce blocks on party/listing interactions

**Input**: Design docs in `specs/045-enforce-blocks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/block-guards.md

**Tests**: Included (Principle V). Integration tests seed real `blocks` rows; `fileParallelism:false`.

**Branch**: `045-enforce-blocks` (off green main `0399f0d`). No schema change, no prod DDL.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Confirm the guard + sites: `hasActiveBlockBetween` (`src/lib/inbox/search-contacts.ts`) is
  bidirectional/active; the four target actions (`apply-to-posting`, `ask-question`, `invite-to-party`,
  `accept-request`) don't import it today. (Verified during planning — this is the pre-edit sanity check.)

---

## Phase 2: User Story 1 — Blocked users can't apply to / question your listing (P1) 🎯 MVP

**Goal**: An active block (either direction) refuses apply + ask; unblocked still works; host-asks-own-listing works.

### Tests for User Story 1

- [ ] T002 [P] [US1] `src/lib/actions/apply-to-posting.test.ts` (amend): active block A↔B (both directions)
  → apply refused, no `applications` row; no block → succeeds; unblock → succeeds; block-lookup path fails closed.
- [ ] T003 [P] [US1] `src/lib/actions/ask-question.test.ts` (amend/add): active block (both directions) → ask
  refused, no `questions` row; no block → succeeds; host asks own listing → succeeds; question on a missing
  posting → graceful refusal.

### Implementation for User Story 1

- [ ] T004 [US1] `apply-to-posting.ts`: after the posting load, add a fail-closed guard
  `hasActiveBlockBetween(applicant.id, posting.hostId)` → neutral "You can't apply to this listing."; wrap so a
  lookup error returns a graceful generic failure (no 500).
- [ ] T005 [US1] `ask-question.ts`: load the posting (existence guard + `hostId`), then the fail-closed guard
  `hasActiveBlockBetween(asker.id, posting.hostId)` → neutral "You can't ask a question on this listing."; missing
  posting → "This listing no longer exists."

**Checkpoint**: T002–T003 pass; blocked apply/ask refused both directions, unblocked works.

---

## Phase 3: User Story 2 — Blocked users can't join your party roster (P2)

**Goal**: An active block (either direction) refuses invite + accept; accept refusal is atomic (seats/roster unchanged).

### Tests for User Story 2

- [ ] T006 [P] [US2] `src/lib/actions/invite-to-party.test.ts` (amend): active block host↔invited (both
  directions) → invite refused, no `applications` row; no block → succeeds; unblock → succeeds.
- [ ] T007 [P] [US2] `src/lib/actions/accept-request.test.ts` (amend): with a pending request and an active block
  (both directions) → accept refused AND posting `seatsOpen`/`status`/roster + conversation unchanged; no block →
  succeeds with seats decremented as before; unblock → succeeds.

### Implementation for User Story 2

- [ ] T008 [US2] `invite-to-party.ts`: after the self/posting/seat checks, add a fail-closed guard
  `hasActiveBlockBetween(host.id, invitedUserId)` → neutral "You can't invite this player."
- [ ] T009 [US2] `accept-request.ts`: inside the transaction, after loading application + posting, guard
  `hasActiveBlockBetween(application.applicantId, posting.hostId)` → `throw new Error("You can't accept this
  request.")` (rolls back); the existing catch already returns a graceful failure and fails closed on a lookup throw.

**Checkpoint**: T006–T007 pass; blocked invite/accept refused; accept refusal leaves seats/roster intact.

---

## Phase 4: User Story 3 — Symmetric + fail-closed + no side effects (P3)

- [ ] T010 [US3] Ensure each path's tests explicitly assert: both block directions refuse identically; the refusal
  message is one of the fixed neutral strings (no block/username disclosure); and a refused interaction leaves no
  new row / no seat/roster change / no notification. Add any missing assertion (much is covered by T002–T007).

**Checkpoint**: Removing symmetry or fail-closed would fail a test.

---

## Phase 5: Polish, History & Rollout

- [ ] T011 [P] Update `CHANGELOG.md` (user-facing: someone you blocked can no longer apply to, question, or join
  your party) + `status.md`; add a `docs/future-work.md` note that block-vs-follow and block-vs-report policies
  remain unresolved (deliberately out of scope).
- [ ] T012 Full local suite green: `npm run typecheck && npm run lint && npm run test && npm run test:e2e`
  (kill any stale port-3000 dev server first).
- [ ] T013 Commit (conventional), merge `--no-ff` to main (green base), push, delete branch; confirm CI green.
- [ ] T014 Publish the Patch Notes prod post (player-facing) via `scripts/publish-patch-note.ts`.

---

## Dependencies & Execution Order

- T001 first. US1 (T002–T005) is the MVP; US2 (T006–T009) is independent (different actions). Within a story,
  tests can be written alongside the impl; the four actions are separate files so T004/T005/T008 are parallelizable,
  while T009 (accept, inside a txn) is the most intricate. US3 (T010) audits the US1/US2 tests. Rollout (T011–T014)
  last; no prod DDL (no schema change), so T013 merges on a green base and T014 announces.

## Notes

- Reuse `hasActiveBlockBetween` — do not re-query `blocks` inline or add a second mechanism.
- Fail-closed: a lookup error refuses gracefully (generic "try again"), never allows, never 500s.
- Neutral messages only; never disclose a block or its direction.
- Test traps: `fileParallelism:false`; seed a real block row and a real unblock (set `unblockedAt`) to test
  re-allow; mock `@/auth` per the action-test pattern; for accept, assert seats/status BEFORE and AFTER.
