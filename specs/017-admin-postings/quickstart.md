# Quickstart: Admin Postings

## Prerequisites

- Local dev DB migrated with this feature's schema changes
  (`postings.autoFlagReason`, `postings.moderationReviewedAt`, new
  `warnings` table) plus `008`'s `reports`, `015`'s `auditEntries`,
  and `016`'s `postings.removedAt`/`user.bannedAt`.
- A moderator-or-higher session, plus a regular-user session.
- Seed data: several postings by different authors — at least one
  with an open user report, one with an `autoFlagReason` set and no
  reports, one with both, and one with neither (should not appear in
  the queue).

## Manual Scenarios

1. **Stats and queue accuracy** — as a moderator, visit
   `/admin/postings`. Confirm the four stats cards (in queue,
   user-reported, auto-flagged, removed today) match a direct count
   of the seeded data. Confirm the "neither" posting does not appear.

2. **Filtering** — select "User-reported"; confirm only postings with
   an open report show. Select "Auto-flagged"; confirm only postings
   with an `autoFlagReason` and no open reports show. Select "All";
   confirm both sets combine without duplicates.

3. **Severity computation** — confirm a posting with a
   harassment/scam-reason report (or a `phishing_or_scam`/
   `boosting_service` auto-flag) shows "High priority"; one with only
   a `new_account_first_post` auto-flag and no reports shows
   "Low / routine."

4. **Approve** — open a reported posting's drawer, confirm "why it's
   here" lists each reporter; select "Approve & clear reports."
   Confirm: the item leaves the queue, the posting is still visible
   on Home/Browse, its reports are now `resolved`, and an audit entry
   was recorded.

5. **Remove** — open a different item's drawer, select "Remove
   posting." Confirm: `removedAt` is set, it no longer appears on
   Home/Browse, "removed today" incremented by one, its reports are
   `resolved`, and an audit entry was recorded.

6. **Warn author** — open a still-public item's drawer, select "Warn
   author." Confirm: a new `warnings` row exists for that author, the
   posting is still public, the item leaves the queue. Visit that
   author's Admin Users (`016`) drawer and confirm the prior-warnings
   count increased.

7. **Ban author** — open another item's drawer, select "Ban author."
   Confirm: the author now shows banned on Admin Users (`016`), the
   posting under review is removed (same effect as Scenario 5), and
   the item leaves the queue.

8. **Access control** — attempt to visit `/admin/postings` as a
   regular (non-moderator) user; confirm access-denied per Error
   Pages' behavior.

9. **Auto-flag at creation** — as a regular user, submit a new
   posting whose title/blurb matches the banned-phrase or
   boosting-keyword list (Post a Game, `005`). Confirm it appears in
   this feature's queue under "Auto-flagged" without any report
   having been filed.

10. **Dashboard KPI accuracy after removal** — after Scenario 5 or 7,
    visit Admin Dashboard (`015`) and confirm "Live postings" and "Top
    games" no longer count the just-removed posting.

## Automated tests

- Unit: `admin-postings.ts` Zod schemas; `get-posting-queue.ts`'s
  queue-membership and computed-severity logic; the auto-flag
  ruleset in `create-posting.test.ts` (`005`).
- Integration: `resolve-posting-report.ts` (approve/remove/warn,
  including report resolution and the audit-log write, and role-gate
  rejection); `ban-posting-author.ts` (delegates to `016`'s ban
  action, then removes the posting); `016`'s `toggle-user-ban.test.ts`
  and `remove-user-content.test.ts` (extended to assert the new
  audit-log write); `015`'s `get-dashboard-kpis.test.ts` and
  `get-top-games.test.ts` (extended to assert `removedAt` exclusion).
- E2E (`e2e/admin-postings.spec.ts`): queue/filter/severity display,
  drawer review, all four resolution actions, access denial, with an
  axe-core scan.
