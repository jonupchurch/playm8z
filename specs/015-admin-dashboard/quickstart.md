# Quickstart: Validating Admin Dashboard

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with a moderator-or-higher test account,
a handful of seeded users/postings/reports across today and the past
week, and (optionally) a few seeded `auditEntries` rows.

## Setup

```bash
npm run dev
```

## Scenario 1 — KPIs, chart, top games

1. Log in as the moderator-or-higher test account, visit `/admin`.
2. Confirm each KPI (total users, active today, new signups, live
   postings, open reports) matches a direct count you can verify via
   `db:studio`.
3. Switch the activity chart's metric between Signups/Active/Postings
   — confirm the 7-day bars change each time and match the underlying
   data.
4. Confirm Top games ranks by current open-posting count, matching
   seeded data.
5. As a non-moderator account, attempt to visit `/admin` — confirm
   access-denied behavior (Error Pages).

## Scenario 2 — Needs attention and recent activity

1. With reports of different `targetType`s seeded (some `open`, some
   not), confirm each Needs-attention card's count matches only the
   open ones for its type.
2. With `auditEntries` seeded, confirm the recent-activity feed lists
   them most-recent-first with actor/action/time.
3. Clear all `auditEntries` (or use a fresh database) — confirm the
   feed shows an empty state, not a broken section.

## Automated tests

- `npm test` — unit tests for each aggregate query
  (`get-dashboard-kpis.ts`, `get-activity-chart.ts`,
  `get-needs-attention.ts`, `get-top-games.ts`) against seeded/fixture
  data; a test confirming `require-role.ts` blocks a non-moderator
  session from this route.
- `npm run test:e2e` — `e2e/admin-dashboard.spec.ts` covering Scenarios
  1-2, with an axe-core accessibility scan.
