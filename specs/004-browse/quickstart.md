# Quickstart: Validating Browse

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up (`npm install`, local Postgres running,
`.env.local` populated — see `status.md`) with a handful of seeded
`postings` rows (`003-home`'s seed script, extended with this
feature's new columns).

## Setup

```bash
npm run dev
```

## Scenario 1 — Search + single facet

1. Visit `/browse` **without logging in** — confirm it loads (no
   redirect, unlike Home).
2. Type a keyword matching a seeded posting's game or title.
3. Select a Genre chip. Confirm results narrow to postings matching
   **both** the keyword and the genre.

## Scenario 2 — Multi-select OR within a facet, AND across facets

1. Select two Region checkboxes. Confirm postings from **either**
   region appear (OR within the facet).
2. Add a Vibe selection. Confirm results now narrow further to
   postings matching the vibe **and** either selected region (AND
   across facets).

## Scenario 3 — Pills and Clear all

1. With several facets active, confirm a removable pill exists for
   each.
2. Remove one pill — confirm only that facet clears, others remain.
3. Select "Clear all" — confirm every facet and the keyword reset, and
   the full open-postings set reappears.

## Scenario 4 — Sort

1. With multiple results visible, switch between Recent / Open seats /
   Soonest.
2. For "Soonest," confirm postings with a `scheduledDate` sort ahead of
   those without one.

## Scenario 5 — Live facet counts

1. Confirm each Game/Region checklist option shows a count matching
   the seeded data.
2. Apply an unrelated facet that excludes some postings — confirm
   Game/Region options whose count drops to `0` still appear (not
   removed from the list).

## Scenario 6 — Empty state

1. Combine facets to match nothing seeded.
2. Confirm the empty state (guidance + "Clear filters" + "Post a game")
   appears.
3. Select "Clear filters" — confirm it behaves like "Clear all."

## Scenario 7 — Selecting a result

1. Select any result card.
2. Confirm navigation to that listing's detail page (a stub is fine if
   Listing detail isn't implemented yet).

## Automated tests

- `npm test` — unit tests for `browse-filters.ts`'s Zod schemas and
  `search-postings.ts`'s facet-combination query logic.
- `npm run test:e2e` — `e2e/browse.spec.ts` covering Scenarios 1-7,
  with an axe-core accessibility scan.
