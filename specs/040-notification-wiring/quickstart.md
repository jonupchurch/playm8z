# Quickstart: validating Notification Wiring

Prereqxs: local dev server running, at least two verified accounts (A and B), and
one with a hostable listing. Notifications are read at `/notifications` (the bell).

## US1 — forum reply → thread author

1. As **A**, create a forum thread.
2. As **B**, reply to A's thread.
3. As **A**, open `/notifications` → a new unread entry: "@B replied to your
   thread “…”", linking to the thread. Filter chip **Forum** includes it.
4. As **A**, reply to your *own* thread → no new notification appears for A.
5. Block B (or have B block A), then have B reply again → A gets no notification.

## US2 — @mention → mentioned player

1. As **B**, post a reply or a new thread containing `@a` (A's handle), plus
   `@ghostnobody` (nonexistent) and B's own `@b`.
2. As **A**, `/notifications` → exactly one "@B mentioned you in “…”" entry
   (unless A is the thread author of a reply — then A gets the single **reply**
   entry, not a mention).
3. Confirm `@ghostnobody` produced nothing and B got no self-mention.
4. Put `@a` twice in one post → A still gets exactly one notification.
5. Confirm a mention across a block relationship produces nothing.

## US3 — accept/decline → applicant

1. As **A**, request to join **B**'s listing.
2. As **B** (host), accept it → as **A**, `/notifications` shows "@B accepted
   your request to join {game · title}", linking to the listing. Under the
   **Requests** filter.
3. Repeat with a second applicant and **decline** → that applicant sees "@B
   declined your request to join …" with a distinct ✕ icon (not the green ✓).
4. As **B**, open your own `/notifications` → no new or doubled entry from your
   own accept/decline (your inbound-request view is unchanged).

## Best-effort (developer check)

- Temporarily force `createNotification` to throw; repeat a reply / accept /
  decline → the reply is still saved, the request is still accepted (conversation
  + seat count correct) / declined, and the user sees normal success. Only a
  logged error, never a user-facing failure or a rolled-back action.

## Automated

- `npm test` — unit (`parse-mentions.test.ts`) + integration
  (`notify-events.test.ts`, and the amended `post-reply` / `create-thread` /
  `accept-request` / `decline-request` tests).
- `npm run test:e2e` — existing forum/inbox flows stay green.
