# Tasks: Prevent duplicate active applications

**Input**: Design docs in `specs/046-applications-unique-active/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/uniqueness-and-migration.md

**Tests**: Included (Principle V). `fileParallelism:false`; concurrency via `Promise.all`.

**Branch**: `046-applications-unique-active` (off green main `437eb49`).

## Phase 1: Setup

- [ ] T001 Confirm: `applications` has no unique index on (postingId, applicantId); both `apply-to-posting`
  and `invite-to-party` do the same `status IN (pending,accepted)` select-then-insert. (Verified in planning.)

## Phase 2: User Story 1 — No duplicate active application, even under a race (P1) 🎯 MVP

### Tests

- [ ] T002 [P] [US1] `dedupe-active-applications.test.ts`: `planDedupe` winner rule (accepted>pending; tie
  oldest then id; declined/withdrawn ignored; distinct pairs untouched; idempotent) + DB wrapper no-op over
  distinct rows.
- [ ] T003 [P] [US1] `apply-to-posting.test.ts` (amend): two concurrent `applyToPosting` (Promise.all) → one
  active row, neither throws (one success, one friendly rejection); a sequential duplicate → friendly rejection.
- [ ] T004 [P] [US1] `invite-to-party.test.ts` (amend): concurrent invite+invite, and apply+invite for the same
  pair → one active row, no raw error.

### Implementation

- [ ] T005 [US1] `src/lib/applications/dedupe-active-applications.ts`: pure `planDedupe(rows)` + async
  `dedupeActiveApplications()` (mirror `dedupe-user-games.ts`). Winner: accepted>pending, then oldest, then id.
- [ ] T006 [US1] Add the partial unique index to `applications` in `src/db/schema.ts`:
  `uniqueIndex("applications_active_uniq").on(t.postingId, t.applicantId).where(sql\`status IN ('pending','accepted')\`)`
  (add `uniqueIndex` to imports if absent; `sql` already imported). Update the "no DB constraint" comment.
- [ ] T007 [US1] Deploy-safety gate (local): run `dedupeActiveApplications()` against local; create the index;
  `drizzle-kit push` twice → second reports no changes, OR confirm it's a harmless partial-index drop/recreate
  (schema-declared, ADR 0018). Verify via `pg_indexes`.
- [ ] T008 [US1] Make `apply-to-posting.ts` conflict-safe: keep the select-check; INSERT
  `.onConflictDoNothing().returning({ id })`; empty return → existing friendly rejection.
- [ ] T009 [US1] Make `invite-to-party.ts` conflict-safe: same treatment, same friendly message.
- [ ] T010 [US1] `scripts/lockdown-applications.ts`: idempotent dedup + create partial index + verify (guarded
  `.env.local` load; mirror `lockdown-usergames.ts`). Run against local.

**Checkpoint**: T002–T004 pass; concurrent duplicates collapse to one row, no raw error.

## Phase 3: User Story 2 — Re-apply after a terminal state (P2)

- [ ] T011 [US2] Add to `apply-to-posting.test.ts`: apply → set status declined → apply again succeeds; same for
  withdrawn; an active row still refuses a re-apply. (Confirms the predicate excludes terminal states.)

## Phase 4: User Story 3 — Dedup winner + defense-in-depth (P3)

- [ ] T012 [US3] Ensure `planDedupe` tests assert accepted-over-pending and oldest tie-break explicitly, and
  that the app-side check alone still rejects a normal duplicate (no reliance on a DB error). Covered largely by
  T002/T003; add any missing assertion.

## Phase 5: Polish, History & Rollout

- [ ] T013 [P] `CHANGELOG.md` (internal correctness — no Patch Notes post) + `status.md`; `docs/future-work.md`
  note on the seat-reconciliation caveat.
- [ ] T014 Full local suite green: `npm run typecheck && npm run lint && npm run test && npm run test:e2e`.
- [ ] T015 Prod rollout by hand (before merge): pull prod `DATABASE_URL` to temp outside repo; run
  `lockdown-applications` (dedup + create index) → record `{groups,deleted}`; verify index via `pg_indexes`;
  delete temp env.
- [ ] T016 Commit (conventional), merge `--no-ff` to green main, push, delete branch; confirm deploy + CI green.
  (No patch note — invisible correctness fix.)

## Dependencies & Notes

- T005 before T006/T007 (index needs dedup first locally). T006 before T007. T008/T009 independent of the index
  mechanics but tested against it. T010 packages dedup+index for prod. US2/US3 layer on US1.
- Reuse patterns: `dedupe-user-games.ts` (dedupe shape), `lockdown-usergames.ts` (migration script),
  `addUserGame` (conflict-safe insert). Traps: `fileParallelism:false`; explicit `createdAt` where tie-order
  matters; concurrency via `Promise.all` with queued `mockResolvedValueOnce` auth; `err.cause.code` if catching 23505.
