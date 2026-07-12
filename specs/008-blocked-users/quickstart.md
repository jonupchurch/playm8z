# Quickstart: Validating Blocked Users

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with at least two verified test accounts.

## Setup

```bash
npm run dev
```

## Scenario 1 — View, search, unblock

1. As user A, block user B via the Block modal (Scenario 2 below, or
   seed a `blocks` row directly via `db:studio`).
2. Visit `/profile/account/blocked` — confirm B appears with avatar,
   handle, and blocked date, and the count is accurate.
3. Search for a name that doesn't match anyone blocked — confirm the
   "no results for this search" message (not the "no blocks at all"
   empty state).
4. Select Unblock on B, confirm in the dialog — confirm B no longer
   appears and the count updates.
5. Log out entirely (no blocks) and confirm the "no blocks at all"
   empty state with a path to block someone.

## Scenario 2 — Block a new user, with and without reporting

1. Select "Block a user," search for user C, pick them.
2. Confirm without checking "Also report" — confirm C now appears on
   the blocked list with no report indicator.
3. Repeat for user D, checking "Also report to moderators" this time —
   confirm a `reports` row now exists (`targetType='user'`,
   `targetId` = D's id) and D's row on the blocked list reflects the
   report.
4. Attempt to search for and block yourself or an already-blocked user
   directly (bypassing the UI, e.g. via a script) — confirm the server
   rejects both.

## Scenario 3 — Unverified user blocked from blocking/unblocking

1. As an authenticated but unverified user, attempt to block or
   unblock someone.
2. Confirm it's blocked with a message directing them to verify their
   email first.

## Automated tests

- `npm test` — unit tests for the Zod schemas; integration tests for
  `block-user.ts` (including self-block rejection, duplicate-active-
  block rejection, the report-row side effect) and `unblock-user.ts`.
- `npm run test:e2e` — `e2e/blocked-users.spec.ts` covering Scenarios
  1-2, with an axe-core accessibility scan of both modals.
