# Quickstart: Validating Home

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up (`npm install`, local Postgres running,
`.env.local` populated — see `status.md`) and at least one test account
exists (Auth & Onboarding).

## Setup

```bash
npm run dev
```

Seed a handful of open `postings` rows directly (e.g. via
`npm run db:studio` or a one-off script) — Post a Game doesn't exist
yet to create them through the UI.

## Scenario 1 — Search narrows the feed live

1. Log in, land on Home (`/`).
2. Type part of a seeded posting's game or title into the search bar.
3. Expect the Live LFG feed to narrow to matching postings without a
   full page reload, and the announced result count to update.

## Scenario 2 — Vibe and region chips combine with search

1. Select a Vibe chip (e.g. "Serious") and a Region chip (e.g.
   "EU-West").
2. Expect only postings matching **both** to remain — confirm a
   posting matching only one of the two doesn't appear.
3. Clear back to "All" / "Any" — expect the full (unfiltered) open
   feed to return.

## Scenario 3 — Sort changes the order

1. With multiple open postings visible, switch the sort control between
   "Recent" and "Open seats."
2. Expect the card order to change accordingly each time.

## Scenario 4 — Selecting a card navigates to Listing detail

1. Select any listing card (or its primary action).
2. Expect navigation to that listing's detail page (a stub/placeholder
   is fine if Listing detail isn't implemented yet).

## Scenario 5 — Trending row narrows the feed

1. Confirm the Trending row shows games ranked by current open-posting
   count, matching what's seeded.
2. Select one of the trending games.
3. Expect the Live LFG feed to narrow to that game, without navigating
   away from Home.

## Scenario 6 — No matches shows the empty state

1. Enter a search term that matches nothing seeded.
2. Expect the empty state (guidance copy + "Post this game" action)
   instead of a blank grid.
3. Select "Post this game" — expect navigation toward the listing-
   creation route, carrying the search term where practical (a stub is
   fine if Post a Game isn't implemented yet).

## Scenario 7 — Logged-out visitor

1. Log out, request `/`.
2. Expect a redirect to `/login` (research.md #3 — this becomes Landing
   once that feature ships).

## Automated tests

- `npm test` — unit tests for `get-trending.ts`'s aggregate logic and
  `live-feed.tsx`'s client-side filter/sort behavior; integration test
  for `get-open-postings.ts` reading real seeded rows from Postgres.
- `npm run test:e2e` — `e2e/home.spec.ts` covering Scenarios 1-6, with
  an axe-core accessibility scan.
