# Quickstart: Landing page

## Prerequisites

- Local dev DB migrated with this feature's schema change
  (`applications.acceptedAt`) plus `001`'s users, `003`'s/`004`'s
  postings, `011`'s applications, `021`'s seeded system content pages.
- A logged-out browser context and an authenticated session.
- Seed data: at least two currently-open postings (ideally different
  genres/platforms), a handful of users, and at least one Application
  with `acceptedAt` within the last 7 days.

## Manual Scenarios

1. **Unauthenticated root route** — as a logged-out visitor, visit
   `/`. Confirm this feature's marketing content renders — not a
   redirect to `/login`, not Home's authenticated content.

2. **Authenticated root route unaffected** — as an authenticated
   visitor, visit `/`. Confirm Home's (`003`) existing content renders
   exactly as before this feature.

3. **Real trust-bar stats** — confirm the three shown numbers (total
   players, distinct games & tables, parties formed this week) match a
   direct count against the seeded data. Confirm no "online now" or
   "avg rating" number appears anywhere on the page.

4. **Real floating hero card** — confirm the hero's floating card
   shows a real, currently-open posting's actual game/title/vibe/seat
   count/host, not the wireframe's static "Mara" example. With a
   second open posting seeded, confirm the smaller secondary card also
   shows a real one.

5. **Empty-state fallback** — with zero currently-open postings
   (temporarily, e.g. in an isolated test DB), confirm a clearly-
   decorative fallback illustration appears instead of any fabricated
   example card.

6. **Genre counts** — confirm "Browse by genre" shows each of
   Browse's 8 genres with its real, current open-posting count.

7. **Reworded features copy** — confirm the profiles/ratings feature
   card reads "Real player profiles" (or equivalent) with no claim of
   reliability scores or live ratings; confirm "Discord integration"
   still shows its "SOON" badge.

8. **CTAs navigate correctly** — select "Get started — it's free,"
   "Browse games," nav "Log in"/"Sign up free," and the final CTA's
   "Sign up free"; confirm each reaches the correct existing route.

9. **Footer links** — confirm About/Privacy/Terms link to the three
   system content pages (`021`); confirm Community Guidelines/Careers/
   Safety Center link to plain slugs (not-found until an admin creates
   them).

10. **`acceptedAt` set correctly** — as a host, accept a pending
    application via Inbox (`011`); confirm that Application's
    `acceptedAt` is now set, and it's reflected in this page's
    "parties formed this week" count on next load.

## Automated tests

- Unit: `get-landing-stats.ts`'s three real stat computations, the
  hero-card selection (incl. the zero-postings fallback case), and the
  per-genre count query.
- Integration: `011`'s amended `accept-request.ts` (now also sets
  `acceptedAt`); the root `page.tsx`'s (`003`) authenticated-vs-
  unauthenticated branch.
- E2E (`e2e/landing-page.spec.ts`): unauthenticated root route content,
  authenticated root route unaffected, real stats/hero-card/genre-
  counts display, all CTAs, footer links, with an axe-core scan.
