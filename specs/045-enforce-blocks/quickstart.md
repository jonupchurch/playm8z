# Quickstart / Validation: Enforce blocks on party/listing interactions

Runnable validation. Vitest integration tests seed real `blocks` rows.

## Per-path (US1 + US2) — `npx vitest run src/lib/actions/apply-to-posting.test.ts src/lib/actions/ask-question.test.ts src/lib/actions/invite-to-party.test.ts src/lib/actions/accept-request.test.ts`

For each of apply / ask / invite / accept:
1. **Blocked (A blocked B)** → the interaction is refused; assert no row created (application/question) and,
   for accept, seats/roster/conversation unchanged.
2. **Blocked (opposite direction, B blocked A)** → still refused (symmetric).
3. **No block** → succeeds exactly as before (regression guard).
4. **Unblock then retry** → succeeds.
5. **accept specifically**: with a pending request between H and P and an active block, the accept is refused
   and the posting's `seatsOpen`/`status` are untouched (atomic refusal).
6. **ask specifically**: the host asking their OWN listing still succeeds (self pair never blocked); a question
   on a non-existent posting is refused gracefully.

## US3 — symmetric + fail-closed + no side effects

- Both block directions asserted per path (above).
- Neutral messages: assert the refusal error contains no "block"/username disclosure (it's one of the fixed
  neutral strings).
- No side effect on refusal: after a refused attempt, assert the relevant table has no new row and (accept) the
  posting is unchanged.

## Full suite (before merge)

- `npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all green. (No schema change, so no
  local DB migration and no prod DDL; e2e should be unaffected but is run per the discipline.)

## No production data step

This feature has no migration and no data backfill — nothing to run against prod. It ships as a normal code
merge; the deploy carries it.
