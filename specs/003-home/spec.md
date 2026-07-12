# Feature Specification: Home

**Feature Branch**: `003-home`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Home feature for playm8z: the search-first discovery page authenticated visitors land on at `/`. Source of truth: resources/wireframes/playm8z - Home.dc.html and resources/guidelines.md section 7.1. Covers the hero headline/tagline, a live search bar, Vibe (All/Fun/Serious) and Region (Any/NA-East/NA-West/EU-West) quick-filter chips, a 'Trending now' row of the top games by open-posting count, and a 'Live LFG' feed of open listing cards with a sort control (Recent/Open seats) and an empty state. The shared top nav bar and footer are Design System infrastructure (exempt from the per-feature gate per docs/feature-list.md) and are out of this feature's own scope. Home is reachable only by authenticated visitors per resources/sitemap.md (a logged-out visitor at `/` sees the separate, not-yet-spec'd Landing feature instead). Groups is platform-wide out of scope, so the wireframe's 'Groups' nav reference doesn't apply to any current feature. The canonical Posting entity is owned by the future 'Post a Game' feature; this spec covers only the read-side shape Home needs to display currently-open listings."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor finds and opens a matching open listing (Priority: P1)

An authenticated visitor lands on Home, searches or filters for something that fits what they want to play right now, and opens a specific listing that matches.

**Why this priority**: This is the entire point of Home — "search-first discovery; get a player matched fast." Without this, the page has no reason to exist.

**Independent Test**: Land on Home, type a search term (or pick a vibe/region chip), confirm the feed narrows live to matching open listings, and confirm selecting a card navigates to that listing's detail page.

**Acceptance Scenarios**:

1. **Given** an authenticated visitor on Home, **When** they type into the search bar, **Then** the Live LFG feed narrows, without a full page reload, to postings whose game, title, or host matches the text.
2. **Given** an authenticated visitor on Home, **When** they select a Vibe chip and/or a Region chip, **Then** the feed narrows to postings matching all currently-selected filters (search text, vibe, and region combine).
3. **Given** a feed of matching results, **When** the visitor selects a listing card, **Then** they are taken to that listing's detail page.
4. **Given** a feed of matching results, **When** the visitor changes the sort control between "Recent" and "Open seats," **Then** the displayed order changes accordingly.
5. **Given** any state of the feed, **When** it renders, **Then** only postings currently in the open status appear — never a full or closed posting.

---

### User Story 2 - Visitor discovers what's trending and jumps to it (Priority: P2)

An authenticated visitor without a specific game in mind glances at the "Trending now" row and picks one of the currently-popular games to narrow the feed to.

**Why this priority**: A secondary, lower-friction path into the same core value (finding a match) for visitors who don't already know what they're searching for; valuable, but the primary search/filter path (US1) works without it.

**Independent Test**: Land on Home, confirm the Trending row shows currently-popular games with their open-posting counts, select one, and confirm the Live LFG feed narrows to that game.

**Acceptance Scenarios**:

1. **Given** an authenticated visitor on Home, **When** the page loads, **Then** the Trending row shows the games with the most currently-open postings, each with its open-posting count.
2. **Given** the Trending row, **When** the visitor selects one of its games, **Then** the Live LFG feed narrows to that game, on the same page (no navigation away from Home).
3. **Given** fewer than five games currently have any open postings, **When** the Trending row renders, **Then** it shows only as many as actually exist, not padded with empty placeholders.

---

### User Story 3 - No listings match, and there's a clear next step (Priority: P3)

An authenticated visitor's search or filter selection matches no currently-open postings, and instead of an empty grid, they see guidance and a way to create the listing themselves.

**Why this priority**: Matters for experience quality and for encouraging supply (new listings) at the exact moment a gap is visible, but it's a less-common state than "some results exist" (US1).

**Independent Test**: Apply a search term or filter combination that matches no open postings, and confirm the empty state (guidance copy + a "Post this game" action) appears instead of a blank grid.

**Acceptance Scenarios**:

1. **Given** a search/filter combination that matches no currently-open postings, **When** the feed renders, **Then** an empty state appears with copy encouraging the visitor to adjust their filters or post the game themselves, plus a "Post this game" action.
2. **Given** the empty state's "Post this game" action, **When** selected, **Then** the visitor is taken to the listing-creation flow (a separate feature), carrying over the current search term as a starting point where practical.

---

### Edge Cases

- What happens when fewer than five games currently have open postings? → The Trending row shows only as many as exist (see US2's Acceptance Scenario 3).
- What happens if a listing visible in the feed closes or fills while the visitor is still looking at Home? → Not addressed live; it drops out of the feed on the visitor's next search/filter change or page refresh, not instantly via a push update.
- What happens for a logged-out visitor who requests `/` before the separate Landing feature exists? → Out of scope for this spec (see Assumptions); Landing's own future spec resolves what a logged-out visitor sees.
- What happens when the search text alone matches nothing, but a vibe or region filter alone would? → Filters combine with AND semantics across search text, vibe, and region — the visible feed is their intersection, not the union of any one alone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show, to an authenticated visitor on Home, a search bar that narrows the Live LFG feed to postings whose game, title, or host matches the entered text, live as the visitor types, without a full page reload.
- **FR-002**: System MUST offer a Vibe quick-filter (All / Fun / Serious) and a Region quick-filter (Any / NA-East / NA-West / EU-West), each combining with the search text and with each other (AND semantics) to narrow the feed.
- **FR-003**: System MUST offer a sort control for the feed (Recent / Open seats).
- **FR-004**: The Live LFG feed MUST show only postings currently in the open status — a full or closed posting never appears.
- **FR-005**: Each listing card in the feed MUST show the host's name and avatar, an indicator that the posting is actively recruiting, a relative post age, region, game, title, a short blurb, its vibe tag, and its current open/total seat count.
- **FR-006**: Selecting a listing card (including its primary action) MUST navigate the visitor to that listing's detail page; Home itself does not create or process an application for a slot.
- **FR-007**: System MUST show a "Trending now" row listing the games with the most currently-open postings, each showing that count, recalculated on every page load (not a hardcoded or cached-indefinitely list).
- **FR-008**: Selecting a game in the Trending row MUST narrow the Live LFG feed to that game, within the Home page itself, without navigating away.
- **FR-009**: When no postings match the current search/filter combination, system MUST show an empty state with guidance copy and a "Post this game" action, instead of an empty grid.
- **FR-010**: A visitor who is not authenticated MUST NOT see Home's content — Home is reachable only by authenticated visitors (unauthenticated requests are the separate Landing feature's concern).
- **FR-011**: The empty state's "Post this game" action MUST lead to the listing-creation flow (a separate, not-yet-spec'd feature), carrying over the current search term as a suggested starting point where practical.

### Key Entities

- **Posting (open listings)**: The entity this feature reads and displays — host, game (a free-text keyword, per ADR 0001, not a catalog reference), title, blurb, vibe (fun/serious), region, relative post age, and open/total seat counts. Owned and created by the future "Post a Game" feature; Home only reads postings currently in the open status.
- **Trending aggregate**: Not a stored entity — a computed ranking of games by their count of currently-open postings, recalculated per page load rather than cached indefinitely.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authenticated visitor can go from landing on Home to viewing a specific matching listing's detail page in 3 clicks or fewer (e.g., apply a filter or search, then select a card).
- **SC-002**: Search and filter changes update the visible feed without a full page reload and without losing the visitor's place on the page.
- **SC-003**: 100% of postings shown in the Live LFG feed are currently open — never full or closed.
- **SC-004**: 100% of no-match states show the guidance copy and a working "Post this game" path, never a blank grid.
- **SC-005**: The Trending row always reflects the games with the most currently-open postings as of that page load, never a stale or hardcoded list.

## Assumptions

- The top nav bar and footer shown in the source wireframe are shared Design System infrastructure (nav shell, exempt from the per-feature gate per `docs/feature-list.md`) — this spec covers only the hero/search/trending/live-feed content area below the nav, not the nav or footer themselves.
- Groups is platform-wide out of scope (`docs/future-work.md`); the wireframe's "Groups" nav reference doesn't apply to this or any other current feature.
- Home is reachable only by authenticated visitors (`resources/sitemap.md`); a logged-out visitor at `/` sees the separate Landing experience instead (its own not-yet-spec'd feature). Until Landing exists, this spec doesn't fix what a logged-out visitor sees at `/` — only that Home itself assumes an authenticated visitor.
- The green "online"-styled indicator on each listing card is decorative, tied to the posting being open (every card shown is already filtered to open postings, so the indicator is consistently true for all of them) — not a real per-user presence/last-active-time system. A true presence system, if ever wanted, is future work, not part of this feature.
- The wireframe's `showTrending` toggle is a design-review aid (like other wireframes' preview switchers), not a real product feature flag — the Trending row is always shown whenever there's data to show.
- Home's Live LFG feed shows a reasonably-sized recent slice of open postings, not full pagination — deep faceted browsing across the entire catalog is the separate Browse feature's job.
- This feature depends on the Posting entity (open listings) existing; the canonical Posting schema and creation flow are owned by the future "Post a Game" feature. This spec describes only the read-side shape Home needs to display, not a schema Home itself is responsible for creating.
- No live/real-time push updates to the feed while a visitor has the page open — a new search, a filter change, or a manual refresh is what re-fetches current results.
