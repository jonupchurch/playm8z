# Quickstart: Validating Forum index

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with a handful of seeded `forumThreads`
rows across categories (including at least one `pinned` row) and a
verified test account.

## Setup

```bash
npm run dev
```

## Scenario 1 — Browse, search, filter, sort

1. Visit `/forum` **without logging in** — confirm it loads (no
   redirect).
2. Select a category — confirm the list narrows and the chip's count
   matches.
3. Search a keyword matching a seeded thread's title/tag — confirm the
   list narrows further (category + search combine).
4. Switch sort to Top and Unanswered — confirm order changes each
   time, with the pinned thread always first regardless.
5. Confirm the right rail shows accurate member/thread counts and
   trending tags derived from seeded data; select a trending tag and
   confirm it applies as the search term.
6. View a category with nothing seeded — confirm the empty state with
   a path to create the first thread.

## Scenario 2 — Create a new thread

1. Log in as a verified user, select "New thread."
2. Fill in category, title, body (tags optional), submit.
3. Confirm the thread appears immediately in its category's list.
4. Log out, attempt to open New Thread — confirm redirection to log in.
5. As an unverified account, attempt to submit a new thread — confirm
   it's blocked with a message directing you to verify your email.

## Automated tests

- `npm test` — unit tests for `forum.ts`'s Zod schemas and the HOT
  heuristic in `search-threads.ts`; integration test for
  `create-thread.ts` (including the unverified-user gate).
- `npm run test:e2e` — `e2e/forum-index.spec.ts` covering Scenarios
  1-2, with an axe-core accessibility scan of the New Thread modal.
