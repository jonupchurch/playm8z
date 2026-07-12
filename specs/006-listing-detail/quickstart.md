# Quickstart: Validating Listing detail

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with seeded postings (`003-home`'s seed
script) and at least two verified test accounts (one to act as host,
one as applicant).

## Setup

```bash
npm run dev
```

## Scenario 1 — Apply, confirm, withdraw

1. Visit a seeded open listing as a verified user who isn't its host.
2. Enter a message, select "Apply for a slot."
3. Confirm the confirmation state appears; confirm a `pending`
   Application row exists for this user/posting.
4. Reload the page — confirm the confirmation state persists (not a
   fresh apply form).
5. Select "Withdraw application" — confirm the apply form reappears
   and the Application's status is now `withdrawn`.

## Scenario 2 — Q&A

1. As a verified non-host user, submit a question.
2. Confirm it appears in the thread immediately, attributed to you.
3. Log in as the listing's host — confirm a reply control appears on
   the unanswered question.
4. Submit a reply — confirm it's now visible to any viewer, including
   logged out.

## Scenario 3 — Capacity and viewer-state correctness

1. Manually set a seeded posting's `seatsOpen` to `0` (via `db:studio`,
   since accepting applications is out of this feature's scope) —
   confirm the header shows "full," not "recruiting," and the apply
   panel offers no way to apply.
2. View a listing as its own host — confirm no apply form is shown.
3. Manually insert an `accepted`-status Application for a test user
   (via `db:studio`) — confirm that user appears in the roster as a
   Member with no role/class label, and the open-slot count and dashes
   reflect one fewer open spot.

## Automated tests

- `npm test` — unit tests for the Zod schemas and `get-roster.ts`'s
  derivation logic; integration tests for each Server Action, including
  the gate-blocked and non-host-reply-rejected paths.
- `npm run test:e2e` — `e2e/listing-detail.spec.ts` covering Scenarios
  1-3, with an axe-core accessibility scan.
