# Quickstart: Admin Forum

## Prerequisites

- Local dev DB migrated with this feature's schema changes
  (`forumThreads`/`forumReplies` gain `autoFlagReason`,
  `moderationReviewedAt`; `forumThreads` gains `lockedAt`;
  `forumReplies` gains `removedAt`; `warnings` generalized to
  `targetType`/`targetId`) plus `008`'s `reports`, `015`'s
  `auditEntries`, and `016`'s `forumThreads.removedAt`/
  `user.bannedAt`.
- A moderator-or-higher session, plus a regular-user session.
- Seed data: a thread and a reply by different authors, each with at
  least one open report; a thread with only an `autoFlagReason` set;
  a reply within a thread that has at least one earlier reply/OP to
  show as preceding context; a thread/reply with neither (should not
  appear in the queue).

## Manual Scenarios

1. **Stats and queue accuracy** — as a moderator, visit
   `/admin/forum`. Confirm the four stats cards (in queue,
   user-reported, auto-flagged, actioned today) match a direct count
   of the seeded data.

2. **Filtering** — select "Threads"; confirm only thread-type items
   show. Select "Replies"; confirm only reply-type items show. Select
   "Auto-flagged"; confirm only unreviewed-auto-flag items show.

3. **Severity and reason labels** — confirm a `harassment`-reported
   item shows "High priority" with a "Harassment" chip; confirm no
   card ever shows the wireframe's non-canonical flavor labels
   ("Scam / phishing," "Off-topic").

4. **Reply-in-context** — open a reply's drawer; confirm the
   immediately-preceding message in that thread shows dimmed above
   the reported reply. Open a thread's drawer; confirm no
   preceding-context block appears.

5. **Approve** — select "Approve & clear reports" on a reported item;
   confirm it leaves the queue, its reports are `resolved`, the
   content stays public, and an audit entry was recorded.

6. **Remove** — select "Remove thread" on a thread; confirm
   `removedAt` is set and it no longer appears on Forum index. Select
   "Remove reply" on a reply; confirm its `removedAt` is set and it no
   longer appears in that thread's reply list on Forum Thread.

7. **Lock** — select "🔒 Lock thread" on a thread's drawer; confirm
   `lockedAt` is set, the item leaves the queue, and a subsequent
   attempt to post a reply to that thread (as a regular user, on Forum
   Thread) is rejected.

8. **Warn author** — select "Warn author" on a still-public item;
   confirm a `warnings` row exists with `targetType`/`targetId` set to
   that thread/reply, the content stays public, and the item leaves
   the queue. Visit that author's Admin Users (`016`) or Admin
   Postings (`017`) drawer and confirm the combined prior-warnings
   count reflects it.

9. **Ban author** — select "Ban author" on another item; confirm the
   author now shows banned on Admin Users, the thread/reply under
   review is removed, and the item leaves the queue.

10. **Access control** — attempt to visit `/admin/forum` as a regular
    (non-moderator) user; confirm access-denied per Error Pages'
    behavior.

11. **Auto-flag at creation** — as a regular user, create a new thread
    or reply matching the shared auto-flag ruleset's keywords. Confirm
    it appears in this feature's queue under "Auto-flagged" without
    any report having been filed.

12. **Retroactive `017` amendments** — on Admin Postings (`017`),
    confirm severity/reason-chip display now matches the canonical
    taxonomy (no "scam" bucket), confirm a newly-created posting
    matching the shared auto-flag ruleset still gets flagged, and
    confirm warning an author from Admin Postings still increments
    their (now-combined) prior-warnings count.

## Automated tests

- Unit: `reason-severity.ts` and `auto-flag-rules.ts` (shared
  helpers); `admin-forum.ts` Zod schemas; `get-forum-queue.ts`'s
  queue-membership, target-classification, and computed-severity
  logic.
- Integration: `resolve-forum-report.ts` (approve/remove/lock/warn,
  including report resolution, the lock-then-reply-rejected effect,
  the audit-log write, and role-gate rejection); `ban-forum-author.ts`
  (delegates to `016`'s ban action, then removes the thread/reply);
  `009`'s `create-thread.test.ts` and `010`'s `post-reply.test.ts`
  (extended for the shared auto-flag ruleset and the lock rejection);
  `017`'s `get-posting-queue.test.ts`, `create-posting.test.ts`, and
  `resolve-posting-report.test.ts` (extended to assert the shared-
  helper and generalized-`warnings` amendments).
- E2E (`e2e/admin-forum.spec.ts`): queue/filter/severity display,
  in-context drawer review, all five resolution actions, access
  denial, with an axe-core scan.
