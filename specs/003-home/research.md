# Phase 0 Research: Home

## 1. How does "live" search/filter/sort work without a new API route?

**Decision**: fetch open postings and the trending aggregate once,
server-side, on each page load (a Server Component), and hand that
list to a Client Component that does all search/filter/sort entirely
in the browser over the already-fetched array — the same approach the
source wireframe's own reference implementation (`DCLogic`) already
uses over its static sample data.

**Rationale**: Home's own spec (Assumptions) already scopes the feed to
"a reasonably-sized recent slice, not full pagination" — small enough
that client-side filtering is trivially fast and satisfies SC-002
("updates without a full page reload") structurally, with no new API
route, no per-keystroke network round-trip, and no debounce logic to
write or test.

**Alternatives considered**: a search API route queried per keystroke
— rejected as unnecessary complexity for a small, already-fetched
dataset; that approach belongs to Browse (the full faceted, paginated
experience), not Home.

## 2. Who owns the shared `postings` table's shape?

**Decision**: Home defines a minimal `postings` table now (data-model.md)
— just the columns Home's own FRs need (host, game, title, blurb,
vibe, region, seat counts, status, createdAt). The future "Post a Game"
feature extends the same table with its own additional columns
(age group, time slots, platform, mic-required, scheduled date,
recurring, voice link, tags — per `guidelines.md`'s fuller Posting
shape) when it's planned, rather than either feature inventing a
competing shape.

**Rationale**: identical pattern to Auth & Onboarding extending the
existing `user` table and Error Pages adding `settings` for the future
Admin Settings feature to extend — whichever feature's plan is written
first and needs a shared entity defines its initial shape; later
features extend it via their own migration.

**Alternatives considered**: waiting to spec Home until after Post a
Game — rejected; reordering the feature list isn't necessary since
plan-level (not spec-level) coordination already has a working
precedent in this project.

## 3. What happens at `/` for a visitor who isn't authenticated, before Landing exists?

**Decision**: redirect to `/login` (Auth & Onboarding's real, already-
planned route) rather than blocking on the not-yet-built Landing
feature. Once Landing ships, that feature's own plan changes this
redirect target from `/login` to rendering Landing directly.

**Rationale**: spec.md deliberately left this unresolved at the product
level (it's Landing's concern); a plan still needs *some* concrete,
working behavior to implement and test today. Redirecting to a route
that already has a real spec and plan (Auth & Onboarding) is the
least-speculative choice available.

**Alternatives considered**: a bare placeholder page — rejected, more
throwaway code than reusing the login route that already exists on
paper; showing Home's content to logged-out visitors anyway —
rejected, directly contradicts spec.md's FR-010.

## 4. How is "Trending" computed?

**Decision**: a `GROUP BY` query over currently-open postings' `game`
column (case/whitespace-normalized), counting rows per distinct game
value, ordered descending, top 5 — recalculated on every request per
spec FR-007/SC-005, not cached indefinitely. Consistent with ADR 0001
(`game` is a free-text keyword, not a foreign key to a catalog table),
so "trending" is purely an aggregate over existing Posting rows, never
a separately maintained leaderboard entity.

**Rationale**: simplest query that satisfies "always current, never
stale" without introducing a new entity or a caching/invalidation
scheme for a value that's cheap to recompute per request at this
project's scale.

**Alternatives considered**: a materialized/cached trending table
updated on a schedule — rejected as unnecessary complexity at this
scale; revisit only if this query ever becomes a real performance
concern.

## 5. Accessibility approach for live-filtering UI

**Decision**: an `aria-live="polite"` region announcing the current
result count whenever search/filter/sort state changes, alongside
standard keyboard operability (chips and sort controls as real
`<button>` elements, visible focus states per the existing design
tokens) — per Principle III, this is the first feature with genuinely
live client-side content changes.

**Rationale**: without an explicit signal, a screen-reader user has no
way to know the grid below just changed after adjusting a filter,
since nothing about the interaction itself (a button click) implies
"content elsewhere on the page changed."

**Alternatives considered**: none — this is a well-established pattern
for live-updating regions, not a genuine tradeoff to weigh.
