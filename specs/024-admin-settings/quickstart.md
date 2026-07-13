# Quickstart: Admin Settings

## Prerequisites

- Local dev DB migrated with this feature's schema changes (extended
  `settings`, `user.role`'s new values) plus `002`'s maintenance-mode
  enforcement, `017`/`018`'s `auto-flag-rules.ts`, `003`/`004`/`009`'s
  existing queries, `001`'s sign-up/account-creation path, and `022`'s
  profile sidebar.
- An admin session, a moderator (non-admin) session, and a regular
  authenticated session.
- Seed data: at least one posting/thread with 1-2 open reports (to
  test the auto-hide threshold), and a profile owner (`007`) with
  `showRegion`/`showAgeGroup` both toggled off.

## Manual Scenarios

1. **Admin-only gate** — attempt to visit `/admin/settings` as a
   moderator (non-admin); confirm access-denied. Visit as an admin;
   confirm access.

2. **Maintenance mode** — toggle it on and save; as a logged-out
   visitor, confirm any non-admin route shows the maintenance page;
   confirm the admin session itself still has full access. Toggle it
   off; confirm normal access resumes.

3. **General settings persist** — edit site name/tagline/support
   email/default theme; save; reload the page and confirm the values
   persisted.

4. **Banned phrase + filter toggle** — add a new banned phrase; create
   a posting matching it (as a regular user via Post a Game); confirm
   it's auto-flagged in Admin Postings' (`017`) queue. Disable the
   boosting-keyword filter; create a posting matching only that
   pattern; confirm it's NOT auto-flagged.

5. **Auto-hide threshold** — set the threshold to 2 and enable
   auto-hide; confirm a posting with 2 open reports disappears from
   Home/Browse. Resolve (Approve or Remove) enough reports to drop it
   below 2; confirm it reappears (if not separately removed) with no
   manual "un-hide" action.

6. **Auto-escalate severity badge** — set it to "Medium+"; confirm a
   medium-or-higher-severity item in Admin Postings'/Forum's/Reports'
   queues shows a "needs ban review" badge; confirm no account was
   banned automatically.

7. **Role assignment** — change a team member from `user`/`viewer` to
   `moderator`; confirm they can now access moderator-gated pages.
   Remove a team member; confirm their role reverts to `user` (not
   banned, not deleted).

8. **Invite by email** — invite an existing user's email with a role;
   confirm their role updates. Invite a nonexistent email; confirm a
   clear "no account found" message, no phantom invite created.

9. **Open signups** — toggle it off; attempt a new sign-up as a
   logged-out visitor; confirm it's rejected with a clear message.
   Confirm an existing user can still log in normally.

10. **Discoverable-by-default** — toggle it, then create a brand-new
    account; confirm that account's own `discoverable` preference
    (`007`) matches the platform default at creation.

11. **Public Profile privacy fix** — visit the seeded profile owner's
    `/u/:handle` (with `showRegion`/`showAgeGroup` off); confirm
    Region and Age group are no longer shown in the sidebar — the
    real gap this feature fixes.

12. **Audit logging** — after any settings save (any section), confirm
    an audit entry was recorded.

## Automated tests

- Unit: `admin-settings.ts` Zod schemas; the auto-hide computed-
  exclusion logic (extended in `003`/`004`/`009`'s test files); the
  "needs ban review" badge logic (extended in `017`/`018`/`019`'s
  test files); `auto-flag-rules.ts`'s settings-driven behavior
  (extended, `017`/`018`).
- Integration: `toggle-maintenance-mode.ts`; `assign-team-role.ts`
  (incl. the not-found-email case); `remove-team-member.ts`;
  `save-feature-flags.ts`; `001`'s amended sign-up/account-creation
  path (open-signups rejection, discoverable-default initialization);
  role-gate rejection (moderator denied, admin allowed) on every
  Server Action here.
- E2E (`e2e/admin-settings.spec.ts`): admin-only gate, all five
  sections' save flows, maintenance-mode's real effect, role
  assignment's real effect, with an axe-core scan.
