# Quickstart: Validating Forum Thread

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with at least one seeded `forumThreads`
row (with a couple of seeded `forumReplies`) and a verified test
account.

## Setup

```bash
npm run dev
```

## Scenario 1 — Read a thread

1. Visit a seeded thread's page **without logging in** — confirm it
   loads (no redirect).
2. Confirm the original post renders with an OP indicator, distinct
   from replies.
3. Switch reply sort among Top / Newest / Oldest — confirm order
   changes each time.
4. Confirm the right rail shows accurate thread info and related
   threads sharing category/tags.
5. Reload the page — confirm the view count increments.

## Scenario 2 — Reply, with and without quoting

1. Log in as a verified user, write and post a reply — confirm it
   appears immediately and the reply count updates.
2. Select "Quote" on an existing reply, confirm the composer reflects
   it, post — confirm the new reply shows the quoted author/text.
3. Log out, attempt to post — confirm redirect to log in. As an
   unverified account, attempt to post — confirm it's blocked with a
   verify-your-email message.

## Scenario 3 — Like and report

1. As a verified user, like the original post — confirm the count
   increases and the control reflects "liked."
2. Like it again (unlike) — confirm the count reverts.
3. Attempt to like the same target twice in rapid succession (e.g., a
   quick double-click or a scripted double-request) — confirm the
   count only ever increases by one.
4. Report a reply — confirm a `reports` row now exists with
   `targetType = 'forum'` and `targetId` set to that reply's id.

## Automated tests

- `npm test` — unit tests for `forum-thread.ts`'s Zod schemas;
  integration tests for `post-reply.ts`, `toggle-like.ts` (including
  the duplicate-like race scenario), and `report-forum-content.ts`.
- `npm run test:e2e` — `e2e/forum-thread.spec.ts` covering Scenarios
  1-3, with an axe-core accessibility scan.
