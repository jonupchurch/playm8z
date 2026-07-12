# Quickstart: Validating Profile + Account settings

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with at least one verified test account
(Credentials-based, to test password change) and one Google-only test
account.

## Setup

```bash
npm run dev
```

## Scenario 1 — Edit profile, games, password, email

1. Log in, visit `/profile/account`.
2. Change display name, region, and bio; save; confirm the Overview
   tab reflects the changes.
3. Confirm the handle is shown as plain read-only text, not an input.
4. On Overview, add a game with a rank and hours; confirm it appears.
   Remove it; confirm it's gone.
5. On Account, change the password (correct current password + a valid
   new one); log out and back in with the new password to confirm.
6. Attempt with an incorrect current password — confirm it's rejected.
7. As the Google-only test account, visit `/profile/account` — confirm
   no password-change section appears.
8. Change the account's email — confirm `emailVerified` resets and a
   new verification link is sent to the new address.

## Scenario 2 — Manage own postings

1. Visit `/profile/postings` as a user with at least one posting with
   no accepted applicants — confirm Edit is available; edit it and
   confirm the change persists.
2. Manually accept an application on one posting (via `db:studio`,
   since accepting is Inbox's job, not yet built) — confirm Edit is no
   longer offered for that posting.
3. Close an open posting — confirm its status becomes `closed`; reopen
   it — confirm it returns to `open`.

## Scenario 3 — Saved listings

1. As a verified user, save a listing from Listing detail
   (`006-listing-detail`).
2. Visit `/profile/saved` — confirm it appears.
3. Unsave it from either the Saved tab or Listing detail — confirm it
   disappears from both.
4. With no saved listings, confirm the empty state (guidance + a path
   to Browse) appears.

## Scenario 4 — Privacy and deactivation

1. Toggle each privacy setting on `/profile/account`; reload and
   confirm each persists.
2. Select "Deactivate account" — confirm the account no longer shows
   up as an active listing host to other visitors (spot-check via
   Home/Browse, or a direct query if those don't yet reflect it).
3. Log back in as that account — confirm it's automatically active
   again, with no separate reactivation step.

## Automated tests

- `npm test` — unit tests for every new Zod schema; integration tests
  for each Server Action, including password-change re-verification,
  the posting-edit-blocked-after-acceptance rule, and deactivate/
  reactivate.
- `npm run test:e2e` — `e2e/profile.spec.ts` covering Scenarios 1-4,
  with an axe-core accessibility scan.
