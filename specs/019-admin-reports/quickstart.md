# Quickstart: Admin Reports

## Prerequisites

- Local dev DB migrated with this feature's schema changes
  (`reports.resolvedAt`, `messages.removedAt`) plus `017`'s/`018`'s
  full moderation schema and `016`'s `user.bannedAt`.
- A moderator-or-higher session, plus at least four regular-user
  sessions (reporter, and separate authors for a posting/thread-or-
  reply/message/profile each).
- Seed data: at least one reported posting, one reported forum
  thread or reply, one reported message, and one reported profile —
  one of them with multiple open reports against the same target. One
  author should have reports against more than one of their own
  postings/threads/messages, to verify the cross-source "total
  reports" aggregate.

## Manual Scenarios

1. **Stats accuracy** — as a moderator, visit `/admin/reports`.
   Confirm the four stats cards (open reports, high priority, resolved
   today, avg response) match a direct count/computation over the
   seeded data.

2. **Grouping** — confirm the target with multiple open reports shows
   as one card with a "N reports" badge, not multiple rows.

3. **Filtering** — select each of Postings/Forum/Profiles/Messages;
   confirm the queue narrows to that target type only.

4. **Severity correction** — confirm an `impersonation`-reasoned
   report shows "High priority" (not medium); revisit Admin Postings
   (`017`) and Admin Forum (`018`) and confirm the same correction
   is now visible there too, without either feature having been
   touched directly.

5. **Drawer + cross-link** — open a grouped report's drawer; confirm
   the representative reporter/note, "+N others reported this," the
   reported content, the reported user's join info/prior-warnings/
   total-reports, and a working "Open in [module] moderation →" link.

6. **Dismiss** — select "Dismiss — no violation"; confirm every open
   report on that target resolves (`resolvedAt` set), the content is
   untouched, and (if it had an unreviewed auto-flag) it may still
   appear in Postings'/Forum's own queue for that separate reason.

7. **Remove (posting/forum)** — select "Remove content" on a
   posting-target report; confirm it behaves identically to removing
   it from Admin Postings' own queue (hidden from Home/Browse, audit
   entry, `resolvedAt` set). Repeat for a forum-target report against
   Admin Forum's own queue.

8. **Remove (message)** — select "Remove content" on a message-target
   report; confirm that message's `removedAt` is set and it no longer
   appears in that conversation on Inbox.

9. **No Remove for profiles** — open a profile-target report's drawer;
   confirm "Remove content" is not shown, only Dismiss/Warn/Ban.

10. **Warn/Ban** — warn a reported user from a message-target report;
    confirm their combined prior-warnings count increases on Admin
    Users (`016`). Ban a reported user from a profile-target report;
    confirm their account is banned with no content-removal side
    effect. Ban from a posting-target report; confirm both the
    account and that posting are affected.

11. **Access control** — attempt to visit `/admin/reports` as a
    regular (non-moderator) user; confirm access-denied per Error
    Pages' behavior.

12. **Total reports aggregate** — confirm the author with reports
    across multiple content types shows the SAME "total reports"
    number on every one of their report cards/drawers, matching a
    manual count across all their reported postings/threads/replies/
    messages plus any direct profile reports.

## Automated tests

- Unit: `classify-forum-target.ts` (shared helper); `admin-reports.ts`
  Zod schemas; `get-reports-queue.ts`'s grouping/severity/filter
  logic; `get-report-review.ts`'s cross-source total-reports
  aggregate; `reason-severity.ts`'s corrected `impersonation` mapping
  (extended, `018`).
- Integration: `dismiss-report.ts` (any target type);
  `resolve-report-action.ts` (delegation into `017`/`018` for
  posting/forum; direct message/profile handling; role-gate
  rejection); `ban-reported-user.ts`; `017`'s
  `resolve-posting-report.test.ts` and `018`'s
  `resolve-forum-report.test.ts` (extended to assert `resolvedAt`);
  `011`'s conversation-view test (extended for `removedAt` exclusion).
- E2E (`e2e/admin-reports.spec.ts`): queue/filter/grouping/severity
  display, drawer review incl. the cross-link, all four resolution
  actions across target types, access denial, with an axe-core scan.
