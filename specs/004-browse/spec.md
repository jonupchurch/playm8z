# Feature Specification: Browse

**Feature Branch**: `004-browse`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Browse & search feature for playm8z: the full faceted discovery page at `/browse`, for video games and tabletop/TTRPG alike. Source of truth: resources/wireframes/playm8z - Browse.dc.html and resources/guidelines.md section 7.2. Facets: keyword search; Vibe (Any/Casual/Serious); Game (checklist, live counts, derived from current open postings' game keyword per ADR 0001 — no curated catalog); Genre (multi-select chips, incl. TTRPG + Tabletop); Region (checklist, live counts); Time slots (multi-select chips); Age group (segmented); Open slots (Any/1+/2+/3+); Platform (segmented, incl. Tabletop); Mic required only (toggle); Clear all. Results: live count, sort (Recent/Open seats/Soonest), removable active-filter pills, responsive listing-card grid, empty state. Unlike Home, Browse is reachable by anyone per resources/sitemap.md — no authentication required to search/filter/view. Age group options must reflect ADR 0002 (18+/21+ only, never the wireframe's 13+ tier). The shared top nav/footer are Design System infrastructure, out of this feature's own scope, same as Home. This feature extends the same `postings` table Home defined (docs/feature-list.md's shared-table pattern) with the additional fields (genre, ageGroup, timeSlots, platform, micRequired, scheduledDate) Browse needs to filter on, which the future Post a Game feature will also rely on."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor searches and filters to find a matching open party (Priority: P1)

Any visitor — logged in or not — searches by keyword and/or combines any number of facets (vibe, game, genre, region, time slot, age group, open slots, platform, mic-required) to narrow the full set of currently-open postings, sorts the results, and opens one that fits.

**Why this priority**: This is Browse's entire purpose — "full faceted discovery." Without it, the page has no reason to exist.

**Independent Test**: Apply a combination of facets (e.g., a genre chip plus a region checkbox) and confirm only postings matching all selected facets appear; confirm multi-select facets combine as OR within themselves; select a result and confirm it opens that listing's detail page.

**Acceptance Scenarios**:

1. **Given** any visitor on Browse, **When** they type a keyword, **Then** results narrow to postings whose game, title, host, blurb, or genre matches the text.
2. **Given** any visitor on Browse, **When** they select values in more than one facet (e.g., a Genre chip and a Region checkbox), **Then** only postings matching **all** selected facets appear (AND across facets).
3. **Given** a multi-select facet (Game, Genre, Region, or Time slots) with more than one value selected, **When** results render, **Then** a posting matching **any** of that facet's selected values appears (OR within the facet).
4. **Given** the Game and Region checklists, **When** they render, **Then** each option shows a live count of currently-open postings matching it.
5. **Given** a results set, **When** the visitor changes the sort control among Recent / Open seats / Soonest, **Then** the order changes accordingly.
6. **Given** any results state, **When** it renders, **Then** only postings currently in the open status appear.
7. **Given** a result, **When** the visitor selects it, **Then** they are taken to that listing's detail page; Browse itself does not create or process an application.

---

### User Story 2 - Visitor manages active filters via pills (Priority: P2)

A visitor who has applied several facets sees each as a removable pill above the results, can remove any single one without touching the others, or clear everything at once.

**Why this priority**: A real usability need once several facets are active (a wall of sidebar controls doesn't show *what's* currently applied at a glance), but the underlying filtering (US1) already works without it.

**Independent Test**: Apply several different facets, confirm a pill appears for each, remove one pill and confirm only that facet's filter clears (others remain active), then select "Clear all" and confirm every facet resets.

**Acceptance Scenarios**:

1. **Given** one or more non-default facet selections, **When** results render, **Then** a removable pill appears for each active selection (each multi-select value gets its own pill).
2. **Given** several active pills, **When** the visitor removes one, **Then** only that specific facet value clears — every other active facet remains applied.
3. **Given** any combination of active facets, **When** the visitor selects "Clear all," **Then** every facet (including the search keyword) resets to its default and the full open-postings set reappears.

---

### User Story 3 - No postings match, and there's a clear next step (Priority: P3)

A visitor's search/facet combination matches no currently-open postings, and instead of a blank grid, they see guidance with a way to loosen filters or create the listing themselves.

**Why this priority**: Matters for experience quality at exactly the moment a visitor might otherwise bounce, but it's a less-common state than "some results exist" (US1).

**Independent Test**: Apply a facet combination that matches nothing, and confirm the empty state (guidance copy, "Clear filters," and "Post a game") appears instead of a blank grid.

**Acceptance Scenarios**:

1. **Given** a facet/search combination that matches no currently-open postings, **When** results render, **Then** an empty state appears with guidance copy, a "Clear filters" action, and a "Post a game" action.
2. **Given** the empty state, **When** the visitor selects "Clear filters," **Then** it behaves identically to User Story 2's "Clear all" (every facet resets).
3. **Given** the empty state, **When** the visitor selects "Post a game," **Then** they are taken toward the listing-creation flow (a separate, not-yet-spec'd feature).

---

### Edge Cases

- What happens when a Game or Region checklist option's live count drops to zero because other active facets exclude it? → The option still appears (so the visitor can see and deselect a facet that's causing zero matches elsewhere), showing a count of `0` rather than disappearing.
- What happens for a posting with no `scheduledDate` when sorting by "Soonest"? → It sorts after every posting that does have a scheduled date, ordered by post recency among itself.
- What happens when the same value is both an active facet selection and the keyword search text matches it too? → No special-casing; both conditions must still hold (facets and keyword search always combine with AND, per the general combination rule).
- What happens for a logged-out visitor selecting a result? → They still reach the listing's detail page (Browse itself requires no authentication, per the Assumptions) — anything requiring an account (like applying for a slot) is that page's own concern.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any visitor, authenticated or not, to search and filter Browse — no login is required to view results.
- **FR-002**: System MUST narrow results to postings whose game, title, host, blurb, or genre matches an entered keyword.
- **FR-003**: System MUST offer a Vibe facet (Any / Casual / Serious, single-select).
- **FR-004**: System MUST offer a Game facet as a multi-select checklist, its options and live counts derived from the game keyword of currently-open postings (per ADR 0001 — not a curated catalog).
- **FR-005**: System MUST offer a Genre facet as a multi-select (FPS, RPG, Co-op PvE, Party, MOBA, Sandbox, TTRPG, Tabletop — an extensible, bounded set distinct from the free-text Game facet).
- **FR-006**: System MUST offer a Region facet as a multi-select checklist with live counts, covering the same region set used elsewhere on the platform (NA-East, NA-West, EU-West, EU-East, Asia, Oceania).
- **FR-007**: System MUST offer a Time slots facet as a multi-select (Mornings, Afternoons, Evenings, Late night, Weekends).
- **FR-008**: System MUST offer an Age group facet (Any / 18+ / 21+, single-select) — no 13+ tier, per ADR 0002's 18+ platform minimum.
- **FR-009**: System MUST offer an Open slots facet (Any / 1+ / 2+ / 3+, single-select) filtering to postings with at least that many open seats.
- **FR-010**: System MUST offer a Platform facet (Any / PC / Console / Cross-play / Tabletop, single-select).
- **FR-011**: System MUST offer a "Mic required only" toggle, showing only postings that require a mic when enabled.
- **FR-012**: All active facets MUST combine with AND semantics across different facets; within a single multi-select facet (Game, Genre, Region, Time slots), multiple selected values combine with OR semantics.
- **FR-013**: System MUST offer a sort control (Recent / Open seats / Soonest) for the results.
- **FR-014**: Results MUST show only postings currently in the open status, along with a live count of matching results.
- **FR-015**: System MUST show a removable pill for every active, non-default facet selection (including each individual multi-select value), each independently removable without affecting other active facets, plus a single "Clear all" action resetting every facet and the keyword search.
- **FR-016**: Selecting a result MUST navigate the visitor to that listing's detail page; Browse itself does not create or process an application for a slot.
- **FR-017**: When no postings match the current search/facet combination, system MUST show an empty state with guidance copy, a "Clear filters" action (equivalent to "Clear all"), and a "Post a game" action.

### Key Entities

- **Posting (open listings)**: The same entity Home reads (`003-home`'s data-model.md), extended here with the fields Browse's facets need: genre, age group (18/21 only), time slots, platform, mic-required, and an optional scheduled date (for "Soonest" sorting). The future Post a Game feature is this entity's canonical writer and may extend it further (recurring, voice link, tags) for its own needs.
- **Facet option counts**: Not stored entities — live counts (Game, Region) are computed per request over currently-open postings, the same "aggregate over existing rows, never a separately maintained list" approach Home's Trending row already established.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any visitor, logged in or not, can reach Browse and see live results without being prompted to authenticate.
- **SC-002**: Applying any combination of facets always narrows results to exactly the set matching AND-across-facets/OR-within-facet semantics (FR-012) — never a superset or a facet silently ignored.
- **SC-003**: 100% of results shown are postings currently in the open status.
- **SC-004**: 100% of active facet selections are represented as an individually removable pill, and "Clear all" always returns to the full, unfiltered open-postings set.
- **SC-005**: 100% of no-match combinations show the guidance empty state with working "Clear filters" and "Post a game" paths, never a blank grid.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as Home (`003-home`).
- Groups is platform-wide out of scope; the source wireframe's "Groups" nav reference doesn't apply here either.
- "Soonest" sorts by each posting's optional scheduled date/time, ascending; a posting with no scheduled date sorts after every posting that has one (falling back to post recency among postings without a date) — the wireframe's own sample data conflates "soonest" with "most recently posted," which this spec treats as a wireframe simplification, not the intended product behavior, since Posting already has a distinct optional `scheduledDate` field (`guidelines.md`'s data model) that "Soonest" more naturally maps to.
- Browse's Game facet options (and their live counts) are derived dynamically from currently-open postings' game values, exactly like Home's Trending row — never a curated, separately-maintained list (consistent with ADR 0001).
- No live/real-time push updates while a visitor has the page open — changing a facet, the search text, or refreshing is what re-queries current results (same assumption Home makes).
- This feature depends on the `postings` table Home (`003-home`) already defined; this spec's own data model extends it with the additional fields Browse's facets need, following the same shared-table pattern (whichever feature needs a field next extends the table, rather than each feature inventing a competing shape).
