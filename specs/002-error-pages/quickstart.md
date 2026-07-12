# Quickstart: Validating Error Pages

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up (`npm install`, local Postgres running,
`.env.local` populated — see `status.md`).

## Setup

```bash
npm run dev
```

No new environment variables needed — the maintenance flag lives in
Postgres (`settings` table), not `.env.local`.

## Scenario 1 — Not found (404)

1. Visit any nonexistent route, e.g. `/this-does-not-exist`.
2. Expect the branded "not found" page — logo, motif, `404`, title,
   message, a "Back to home" and a "Browse games" action.
3. Confirm via browser dev tools (Network tab) that the response status
   is `404`, not `200`.
4. Click each action, confirm both land on a working page.

## Scenario 2 — Server error (500)

1. Trigger an unhandled error (e.g., a temporary test route that
   throws, removed before shipping, or by temporarily breaking a data
   fetch).
2. Expect the branded "server error" page with a "Try again" action, a
   "Back to home" action, and a visible reference code.
3. Confirm the response status is `500`.
4. Confirm no stack trace, file path, or query text appears anywhere in
   the rendered page or its HTML source.
5. Click "Try again" — confirm the segment re-renders (via
   `unstable_retry()`) rather than doing nothing.

## Scenario 3 — Access denied (401 / 403)

1. As a logged-out visitor, request a route that requires
   authentication (a synthetic test route calling `unauthorized()`,
   since no real gated page exists yet in this codebase — see
   research.md #3).
2. Expect the same branded "access denied" page, offering "Log in" and
   "Back to home." Confirm the response status is `401`.
3. Log in as a non-moderator account, request a route restricted to
   moderator-or-higher (a synthetic test route calling `forbidden()`).
4. Expect the identical-looking page. Confirm the response status is
   `403` this time (not 401).
5. Repeat step 3 with a nonexistent path under the same restricted
   area — confirm it still renders "access denied," not "not found."

## Scenario 4 — Maintenance mode

1. Flip `maintenanceMode` to `true` via `npm run db:studio` (or a raw
   SQL update against the local `settings` row).
2. Visit any non-admin route (e.g. `/`, `/browse`) — expect the branded
   "down for maintenance" page. Confirm the response status is `503`.
3. Visit a synthetic `/admin/*` test route as a moderator-or-higher
   session — expect normal content, not the maintenance page.
4. Set `maintenanceMessage` to a custom string, refresh — expect that
   exact message to appear. Clear it back to `null`, refresh — expect
   the generic "back shortly" copy instead.
5. Flip `maintenanceMode` back to `false` before continuing other
   testing.

## Automated tests

- `npm test` — unit tests for `get-settings.ts`'s Zod validation and
  `require-role.ts`'s role-check logic.
- `npm run test:e2e` — `e2e/error-pages.spec.ts` (all four/five status
  cases above, each with an axe-core accessibility scan) and
  `e2e/maintenance.spec.ts` (Scenario 4, including the `/admin/*`
  exemption).
