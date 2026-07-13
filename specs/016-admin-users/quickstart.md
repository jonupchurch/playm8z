# Quickstart: Validating Admin Users

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with a moderator-or-higher test account,
several seeded users (some with open `reports` rows against them,
targetType `user`), and at least one seeded posting and forum thread
per user.

## Setup

```bash
npm run dev
```

## Scenario 1 — View, search, filter

1. Log in as the moderator-or-higher test account, visit
   `/admin/users`.
2. Confirm the four stats cards match direct counts (`db:studio`).
3. Search by a seeded user's name/handle/email — confirm the table
   narrows.
4. Filter by each status — confirm a user with open reports (and not
   banned) shows as "Flagged" without any manual toggle having set it.
5. As a non-moderator account, attempt to visit — confirm access
   denial.

## Scenario 2 — Ban / unban

1. Ban an active user from the table row — confirm their status
   becomes "Banned" everywhere (table, stats) immediately.
2. Open their drawer — confirm the Ban control now reads "Unban";
   select it — confirm status reverts (to "Flagged" if they still have
   open reports, otherwise "Active").

## Scenario 3 — Review and remove content

1. Open a user's drawer, switch between Postings and Forum posts tabs
   — confirm accurate listings; open a user with no content on one tab
   — confirm the empty state.
2. Remove a listed posting — confirm it disappears from the drawer,
   and confirm it no longer appears on Home or Browse.
3. Remove a listed forum thread — confirm it disappears from the
   drawer and no longer appears on Forum index.

## Automated tests

- `npm test` — unit tests for the computed-flagged logic and
  `search-admin-users.ts`; integration tests for `toggle-user-ban.ts`
  and `remove-user-content.ts` (including the role-gate rejection and
  confirming Home/Browse/Forum index's queries now exclude the removed
  rows).
- `npm run test:e2e` — `e2e/admin-users.spec.ts` covering Scenarios
  1-3, with an axe-core accessibility scan of the drawer.
