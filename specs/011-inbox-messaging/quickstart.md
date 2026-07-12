# Quickstart: Validating Inbox / messaging

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with at least two verified test accounts
and a seeded open posting with a pending Application (host = account A,
applicant = account B).

## Setup

```bash
npm run dev
```

## Scenario 1 — Read and send messages

1. Log in as account A, visit `/inbox`.
2. Confirm the pending Application from B appears as a "request" list
   item, previewing B's application message.
3. Seed (or create via Scenario 2) an ordinary conversation between A
   and a third account C; confirm it appears alongside the request.
4. Search the list by C's name — confirm it narrows correctly.
5. Open the conversation with C, send a message — confirm it appears
   immediately and the list's preview/time updates.

## Scenario 2 — Start a new conversation

1. As account A, open compose, search for account C, select them,
   start the chat — confirm a new direct conversation appears and
   becomes active.
2. Repeat, selecting both C and a fourth account D — confirm a group
   conversation is created instead.
3. Attempt compose search for an account that has blocked A (or whom A
   has blocked) — confirm they don't appear in results; attempt to
   message them directly (bypassing the UI) — confirm it's rejected.

## Scenario 3 — Accept / decline a request

1. As account A, open the pending request from B, select Accept.
2. Confirm: the Application's status is now `accepted`; the posting's
   `seatsOpen` decremented by one (and `status` is `full` if that was
   the last spot); a real conversation now exists with B; the request
   banner no longer appears.
3. Confirm B now appears in that posting's roster on Listing detail
   (`006-listing-detail`).
4. Repeat with a second pending Application, selecting Decline instead
   — confirm the Application is `declined`, no change to `seatsOpen`,
   and no conversation is created.

## Automated tests

- `npm test` — unit tests for `inbox.ts`'s Zod schemas and
  `get-inbox-list.ts`'s merge logic; integration tests for
  `send-message.ts`, `start-conversation.ts` (including duplicate-
  direct-conversation reuse and block exclusion), and `accept-request.ts`
  /`decline-request.ts` (including the atomic seatsOpen/status update).
- `npm run test:e2e` — `e2e/inbox.spec.ts` covering Scenarios 1-3, with
  an axe-core accessibility scan of the compose modal and message list.
