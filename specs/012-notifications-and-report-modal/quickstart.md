# Quickstart: Validating Notifications + Report modal

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with a handful of seeded `notifications`
rows across types/read-states for a verified test account (since this
feature doesn't wire up live triggers itself — research.md #1), plus
at least one pending join-request Application (for US2) and a
reportable target (e.g., a seeded posting).

## Setup

```bash
npm run dev
```

Seed notifications directly via `npm run db:studio` or a one-off
script — no feature yet creates them live.

## Scenario 1 — View, filter, mark read

1. Log in, open the bell dropdown — confirm the unread count and
   preview match seeded data.
2. Visit `/notifications`, cycle through each filter (All / Unread /
   Requests / Forum / System) — confirm results narrow correctly,
   grouped Today / Earlier.
3. Select an unread notification — confirm it's marked read and the
   count updates. Select "Mark all read" — confirm every indicator
   clears.
4. Filter to a category with nothing seeded — confirm the "You're all
   caught up" empty state.

## Scenario 2 — Accept/decline from a notification

1. With a pending join-request notification, select Accept directly
   from the row.
2. Confirm the same result as accepting from Inbox (`011`): Application
   accepted, posting's open-slot count decremented, a conversation now
   exists.
3. Confirm the notification now shows a resolved state, not the
   Accept/Decline controls, from either entry point.

## Scenario 3 — Submit a report, with and without also blocking

1. Trigger the report flow against a seeded target (e.g., a test route
   or an already-wired entry point).
2. Pick a reason, continue, submit without checking "Also block" —
   confirm exactly one `reports` row exists with that reason.
3. Repeat, checking "Also block" — confirm both a `reports` row and a
   `blocks` row now exist.
4. As a logged-out visitor, attempt to open the flow — confirm
   redirection to log in; as unverified, attempt to submit — confirm
   it's blocked with a verify-your-email message.

## Automated tests

- `npm test` — unit tests for `notifications.ts`'s Zod schemas,
  `get-notifications.ts`'s filter/grouping logic, and
  `create-notification.ts`; integration tests for `mark-*` actions and
  `submit-report.ts` (including the optional block side effect).
- `npm run test:e2e` — `e2e/notifications.spec.ts` covering Scenarios
  1-3, with an axe-core accessibility scan of the bell dropdown and
  report modal.
