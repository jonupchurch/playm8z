# Quickstart: Validating News feed

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with a handful of seeded `newsPosts` rows
(including exactly one `featured = true` and at least one `Event`
category post with `upcoming = true`).

## Setup

```bash
npm run dev
```

## Scenario 1 — Browse, filter, search, paginate

1. Visit `/news` **without logging in** — confirm it loads (no
   redirect) and the featured post renders prominently, excluded from
   the grid below.
2. Select a category — confirm the featured section disappears and
   the grid narrows to that category.
3. Clear the category, search a keyword matching a seeded post's
   title — confirm the featured section stays hidden and results
   narrow to matches.
4. With more posts seeded than fit on one page, select "Load more" —
   confirm the next batch appends without losing the active
   category/search.
5. Filter/search to something matching nothing — confirm the "No
   posts here yet" empty state.

## Scenario 2 — Subscribe to the newsletter

1. Submit a validly-formatted email in the subscribe strip — confirm a
   `newsletterSubscribers` row now exists.
2. Submit a malformed email — confirm it's rejected with a clear
   message.
3. Submit the same valid email again — confirm no duplicate row is
   created.

## Automated tests

- `npm test` — unit tests for `news.ts`'s Zod schemas and
  `search-news.ts`'s featured/filter/pagination logic; integration
  test for `subscribe-newsletter.ts` (including duplicate-email
  rejection at the database level).
- `npm run test:e2e` — `e2e/news-feed.spec.ts` covering Scenarios 1-2,
  with an axe-core accessibility scan.
