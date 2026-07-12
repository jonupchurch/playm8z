# Phase 0 Research: Browse

## 1. Client-side filtering (like Home) or server-side?

**Decision**: server-side. Facet state lives in the URL's search
params; `src/app/browse/page.tsx` is an async Server Component that
awaits `searchParams`, validates it, and runs a real Drizzle query with
the matching `WHERE` clauses — unlike Home, which fetches once and
filters an already-small array in the browser.

**Rationale**: Home's spec explicitly scoped itself to "a reasonably-
sized recent slice, not full pagination," deferring "deep faceted
browsing across the entire catalog" to Browse (Home's own Assumptions).
Browse *is* that deep, comprehensive surface — shipping every
currently-open posting to the browser to filter client-side doesn't
scale the way it does for Home's small slice, and doesn't give
shareable/bookmarkable filtered URLs, which a "full faceted discovery"
page benefits from. Since Next.js App Router navigations are soft
(client-side) transitions by default, updating `searchParams` still
satisfies spec.md's "no full page reload" framing even though the data
now comes from a fresh server query each time.

**Alternatives considered**: client-side filtering over the full open-
postings set (Home's approach) — rejected for the scaling and
shareable-URL reasons above; a dedicated search API route called via
`fetch` on every facet change — rejected as unnecessary indirection
when the Server Component + `searchParams` pattern already gives the
same result with less code and no extra network round-trip shape to
maintain.

## 2. Keeping the keyword field responsive without spamming navigation

**Decision**: debounce the keyword input's URL update (a few hundred
milliseconds) before calling `router.replace()` with the new
`searchParams`, so a fast typist doesn't trigger a server round-trip
per keystroke. Facet chip/checkbox/toggle changes update the URL
immediately (no debounce needed — they're discrete clicks, not a typed
stream).

**Rationale**: keeps the "live" feel spec.md's FR-002 implies without
over-fetching on every keystroke.

**Alternatives considered**: a client-side "Search" button requiring
explicit submission — rejected, the wireframe and spec both frame this
as a live-narrowing experience, not a submit-to-search form.

## 3. Reusing (and extending) Home's listing-card component

**Decision**: relocate `src/components/home/listing-card.tsx`
(introduced by `003-home`) to `src/components/listings/listing-card.tsx`
— a shared, feature-agnostic location — and extend it with the genre
eyebrow and time-slot tag Browse's fuller Posting data includes but
Home's minimal shape didn't. Both Home and Browse import the same
component going forward.

**Rationale**: `guidelines.md`'s own framing describes "Listing card
(the atom of the product)" as a single reusable atom, not a
per-feature one — Home's original version was correct for what it
needed at the time (an earlier feature, planned before Browse's fuller
Posting fields existed), and Browse is simply the point at which the
component needs to grow into that fuller shape. Maintaining two
near-identical card components would be the kind of duplication
Principle IV's spirit (and plain good practice) argues against.

**Alternatives considered**: a separate `browse-listing-card.tsx` —
rejected as needless duplication of an already-shared visual atom;
patching Home's already-merged spec/plan retroactively — rejected,
specs are point-in-time artifacts, and correcting a shared dependency
forward (as later features discover a fuller need) is the same pattern
already used for the `postings` table itself.

## 4. Validating facet input from `searchParams`

**Decision**: a single Zod schema (`src/lib/validations/browse-filters.ts`)
validating every possible facet key — enum membership for single-select
facets (vibe, ageGroup, openSlots, platform, sort), a bounded array of
enum values for multi-select facets (games as free-text but length-capped,
genres, regions, timeSlots), a boolean for `micRequired`, and a
length-capped string for the keyword — applied before any value reaches
the query builder.

**Rationale**: this is the first feature where a visitor-controlled
value (a URL query string, trivially editable by hand) feeds directly
into a database query's `WHERE` clause shape, not just a client-side
array filter — Principle II's "nothing crosses a trust boundary
unchecked" applies more concretely here than it did to Home's read-only
client-side state.

**Alternatives considered**: trusting `searchParams` shape implicitly
since only Drizzle's query builder (not raw SQL) touches it — rejected;
Principle II doesn't carve out an exception for "the ORM would probably
handle it safely anyway."

## 5. Facet option counts and the Game facet's option list

**Decision**: computed per request, the same way Home's Trending row is
— a `GROUP BY` (or equivalent) count over currently-open postings for
Game and Region facet options, never a separately maintained/cached
list. The Game facet's *options* are simply the distinct `game` values
present among currently-open postings (consistent with ADR 0001 — no
curated catalog).

**Rationale**: reuses an already-established pattern (Home's Trending
aggregate) rather than inventing a second approach to the same kind of
problem.

**Alternatives considered**: none new — this directly follows research
already done for Home.
