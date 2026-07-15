# Quickstart: Admin Users Drawer — View Full Profile in a New Tab

## Prerequisites

- Local Postgres running with the schema pushed (`npx drizzle-kit push`).
- Dev server running (`npm run dev`) or let Playwright's own `webServer` start it.
- A seeded user with `role: "moderator"` (or `"admin"`) and a real password hash, and at least one other seeded user to view in the drawer — see `e2e/audit-log.spec.ts`'s `beforeAll` for the exact pattern to copy.

## Manual validation

1. Log in as the seeded moderator (`/login`).
2. Go to `/admin/users`, click any row to open the drawer.
3. Confirm a "View full profile" control is visible in the drawer, for an active user, a flagged user, and a banned user alike (Scenario 2).
4. Click it. Confirm:
   - It opens in a **new tab** (Scenario 1/4) — the original tab still shows the drawer open on the same user, same admin queue filters/scroll position.
   - The new tab's URL is `/u/<that user's handle>`.
   - The new tab's content is the ordinary Public Profile page — same as opening that URL directly, logged out (Scenario 3).
5. Close the new tab, confirm the original admin tab is untouched.

## Automated validation (e2e)

Extend `e2e/admin-users.spec.ts` (or add a new `describe` block in it) with a real seeded `moderator` session — see `research.md` #3 for why this is now viable (no longer blocked by `require-role.ts`):

1. Seed a moderator user + a second "target" user (with a known, predictable handle) in `beforeAll`, log in as the moderator via the real `/login` form.
2. Open `/admin/users?userId=<target user id>` (or click the row) so the drawer renders for the target user.
3. Locate the "View full profile" control and assert:
   - `href` equals `/u/<target handle>`.
   - `target` is `_blank` and `rel` includes both `noopener` and `noreferrer`.
4. Optionally: open a new page via the link (Playwright's `context.waitForEvent("page")` on click) and assert the resulting page's URL and that it renders the target user's real profile heading — proving it's the same page a logged-out visitor would see, not an admin-only variant.
5. Repeat the presence check (step 3) for a banned/flagged target user, confirming the control isn't conditionally hidden.

## Expected outcome

All of spec.md's acceptance scenarios (US1, 1–4) pass; SC-001–SC-003 are satisfied.
