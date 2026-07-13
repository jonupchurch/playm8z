# Feature Specification: Landing page

**Feature Branch**: `026-landing-page`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Logged-out marketing landing page at `/`. Source of truth: resources/wireframes/playm8z - Landing.dc.html and docs/feature-list.md item 26. Hero (rotating-word headline, live-feeling stat badge, floating example listing card(s), CTA buttons), a trust-stat bar, a three-step 'how it works' explainer, a features grid, 'browse by genre' with live counts, testimonials, a final CTA, and a footer. This is the final feature of the project-wide spec/plan/tasks gate -- once this merges, all 26 tracked features have a complete trio and the constitution allows implementation to begin on any/all of them.

This feature closes a loop Home's (003) own spec explicitly left open: 'a logged-out visitor at `/` sees the separate, not-yet-spec'd Landing feature instead... until Landing exists, this spec doesn't fix what a logged-out visitor sees at `/`.' Home's root `page.tsx` currently REDIRECTS an unauthenticated visitor to `/login` (003's own research.md #3, an explicitly temporary placeholder). This feature's own scope includes the small, bounded amendment making that same root route render this feature's content instead of redirecting, for an unauthenticated visitor only -- an authenticated visitor continues to see Home exactly as `003` already built it.

Reconciliations against already-established decisions (this feature -- fittingly, as the last one -- required reconciling nearly every 'live-feeling' marketing number against this project's now-consistent 'no fake data' discipline):
- The hero's '4,300+ players online now' presence-style stat is dropped -- the same repeated, explicit rejection of real online-presence tracking already applied to Home, Profile, Forum Index, Inbox, Admin Dashboard, and Public Profile. Replaced with a genuinely live, computed stat that doesn't need presence tracking: 'N open parties right now' (a real `COUNT(postings WHERE status = 'open')`).
- The floating hero listing card(s) show REAL, currently-open postings (the most recent one or two, reusing Home's/Browse's existing open-postings query) rather than fabricated example content -- consistent with this project's page-wide stance that a functional-looking UI element never displays invented data, even on a marketing page. A graceful, honest fallback illustration is shown if zero postings are currently open (a brand-new deployment).
- The trust-stat bar's four numbers are reconciled individually: 'players' -> a real `COUNT(user)`; 'games & tables' -> a real `COUNT(DISTINCT game)` across postings (ADR 0001 -- games are free-text keywords); 'parties formed this week' -> a real count of Applications accepted in the last 7 days, which needs a small, bounded new field (`applications.acceptedAt`, set alongside the existing `accepted` status transition in Inbox's, 011, `accept-request.ts` -- that table never needed a timestamp for WHEN acceptance happened, only that it did) since no existing timestamp captures this; 'avg teammate rating' is DROPPED entirely -- Public Profile's (022) `Review` entity has no writer yet (rating submission remains deferred platform-wide), so there is no real number to show, and this project has never once substituted a fabricated number for a genuinely absent one. The bar ships with three real stats, not four.
- The 'Join 48,000+ gamers already matched' line reuses the SAME real user-count value as the trust bar's 'players' stat -- one computed number, shown twice, never two different ones (one real, one invented).
- The 'Why playm8z' feature grid's 'Real profiles & ratings' card copy is reworded to 'Real player profiles' and no longer claims 'reliability scores' exist (`reliabilityPct` was already explicitly deferred) or that ratings/reviews are live (they aren't, per the `Review`-has-no-writer status above) -- it describes only what a visitor can actually see today (a real profile, games played, region/platform info), not features that don't yet function. 'Discord integration' keeps its wireframe-native 'SOON' badge, already consistent with that feature's established deferral.
- 'Browse by genre' shows real, live per-genre open-posting counts, reusing Browse's (`004`) existing fixed 8-genre enum and a straightforward `GROUP BY genre` count -- the same 'Trending now' computation pattern Home (`003`) already established for its own top-games row, applied per-genre instead of per-game.
- Testimonials remain fixed, hand-written marketing copy, not sourced from any real review/feedback system -- distinguished from every other 'no fake data' reconciliation in this project by kind, not by exception: a marketing page's testimonial section is universally understood as curated editorial copy (the same category as ad copy or a tagline), not a claim that a specific, verifiable, live data feed backs it -- unlike a product page's stat, badge, or listing card, which visitors reasonably read as real-time facts about the platform's current state.
- Footer links to About/Privacy/Terms point at the three system `ContentPage` rows Admin Content Pages (`021`) already seeds; Community Guidelines/Careers/Safety Center point at plain custom-page slugs this feature does NOT seed itself (an editorial decision for whenever an admin creates them via `021`'s existing '+ New page' -- visiting an as-yet-uncreated slug shows Content Page's, `014`, existing not-found behavior, same as any other not-yet-created custom page). 'Groups (soon)' keeps its existing correct deferred labeling.
- This feature includes the small, bounded amendment to Home's (`003`) root `page.tsx`: render this feature's content for an unauthenticated visitor instead of redirecting to `/login` (research.md #3 there called this exact redirect a temporary placeholder pending this feature). An authenticated visitor's experience at `/` is completely unchanged."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A logged-out visitor sees the marketing landing page at `/` (Priority: P1)

An unauthenticated visitor to the root domain sees a real, honest marketing page: hero, trust stats, how-it-works, features, genre browse, testimonials, and a final call to action — with every "live-feeling" number backed by real, current data (or honestly omitted if none exists).

**Why this priority**: The entire purpose of this feature — closing the loop Home's own spec left open, and giving every prior feature's real activity a place to be shown off truthfully.

**Independent Test**: Visit `/` as a logged-out visitor; confirm the marketing page renders (not a redirect to `/login`); confirm every stat/number shown matches a direct query of the current database, and that no fabricated number (online-presence count, average rating) appears anywhere.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they visit `/`, **Then** they see this feature's marketing content, not a redirect to `/login` and not Home's (`003`) authenticated content.
2. **Given** the same visitor, **When** the page renders, **Then** the trust-stat bar shows three real, currently-accurate numbers (total players, distinct games/tables, parties formed in the last 7 days) — no presence-style "online now" count and no average-rating number appear anywhere on the page.
3. **Given** an authenticated visitor, **When** they visit `/`, **Then** they see Home's (`003`) existing content exactly as before — this feature changes nothing about the authenticated experience.
4. **Given** the "Browse by genre" section, **When** it renders, **Then** each genre shows its real, current count of open postings.
5. **Given** zero currently-open postings exist (a brand-new deployment), **When** the floating hero listing card would normally show one, **Then** a graceful, honest fallback illustration appears instead of fabricated example content.

---

### User Story 2 - A logged-out visitor navigates to sign up, log in, or browse from the landing page (Priority: P2)

A visitor uses the landing page's calls to action (hero buttons, nav links, final CTA) to reach sign-up, log-in, or Browse.

**Why this priority**: The conversion actions this page exists to drive, but they follow from the page itself rendering correctly and honestly (US1).

**Independent Test**: Select each CTA (hero "Get started," hero "Browse games," nav "Log in"/"Sign up free," final CTA "Sign up free") and confirm each navigates to the correct existing route.

**Acceptance Scenarios**:

1. **Given** the hero, **When** the visitor selects "Get started — it's free," **Then** they're taken to sign-up (Auth & Onboarding, `001`).
2. **Given** the hero, **When** the visitor selects "Browse games," **Then** they're taken to Browse (`004`) — accessible without authentication, per that feature's own existing scope.
3. **Given** the nav bar, **When** the visitor selects "Log in" or "Sign up free," **Then** they're taken to the corresponding existing route (`001`).
4. **Given** the final CTA section, **When** the visitor selects "Sign up free," **Then** they're taken to sign-up.

---

### User Story 3 - The floating hero card shows a real, live example posting (Priority: P3)

The hero's floating listing card(s) illustrate the product using an actual, currently-open posting rather than invented example content.

**Why this priority**: A polish/trust detail — most of this page's value (US1) and conversion value (US2) doesn't depend on this specific illustration being real versus a static mock, but this project's consistent no-fake-data discipline makes it worth doing properly rather than leaving one last fabricated example on the very last feature.

**Independent Test**: With at least one currently-open posting seeded, confirm the floating card shows that posting's real game/title/vibe/seat-count/host; with zero open postings, confirm the graceful fallback instead.

**Acceptance Scenarios**:

1. **Given** at least one currently-open posting exists, **When** the hero renders, **Then** the floating card shows a real one (game, title, vibe, seat count, host handle) — the same data Home's/Browse's own listing cards already display, not invented content.
2. **Given** a second currently-open posting exists (ideally a different platform/genre, e.g. a tabletop one, for visual variety), **When** the hero renders, **Then** the smaller secondary card also shows a real one.
3. **Given** zero currently-open postings exist, **When** the hero renders, **Then** a static, honestly-decorative illustration replaces the card — never a fabricated example presented as if it were real.

### Edge Cases

- What happens to the wireframe's "online now" stat? → Dropped; replaced with a real "open parties right now" count (see Input).
- What happens to "avg teammate rating"? → Dropped entirely — no real rating data exists yet (`022`'s `Review` entity has no writer).
- What happens to "parties formed this week" if `applications.acceptedAt` doesn't exist yet? → This feature adds it, set by Inbox's (`011`) existing `accept-request.ts` alongside its status transition — a small, bounded new field, not a new entity.
- What happens to testimonials? → Fixed marketing copy, not sourced from a real review system — a deliberate, reasoned exception to this project's no-fake-data discipline, since a testimonial section is universally understood as curated editorial copy, not a real-time data claim (see Input).
- What happens to footer links for pages that don't exist yet (Community Guidelines, Careers, Safety Center)? → Link to real `ContentPage` slugs an admin can create later via Admin Content Pages (`021`); visiting one before it exists shows Content Page's (`014`) existing not-found behavior.
- What happens at `/` for an authenticated visitor? → Completely unchanged — Home's (`003`) existing content, exactly as before this feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show an unauthenticated visitor to `/` this feature's marketing content, replacing Home's (`003`) previously-temporary redirect-to-`/login` for that case only.
- **FR-002**: System MUST leave an authenticated visitor's experience at `/` (Home, `003`) completely unchanged.
- **FR-003**: The trust-stat bar MUST show three real, currently-accurate numbers (total players, distinct games/tables, parties formed in the last 7 days) computed at render time — no presence-style count, no average-rating number.
- **FR-004**: The hero's "Join N gamers already matched" line MUST reuse the same real total-player count as the trust bar, never a separately-fabricated number.
- **FR-005**: The floating hero listing card(s) MUST show real, currently-open posting(s) (reusing Home's/Browse's existing open-postings data), with a graceful, honestly-decorative fallback when none currently exist.
- **FR-006**: "Browse by genre" MUST show each of Browse's (`004`) existing 8 genres with its real, current count of open postings.
- **FR-007**: The "Why playm8z" feature grid's profile/ratings card MUST describe only currently-real capabilities (real player profiles), not deferred/inert ones (reliability scores, live ratings) — "Discord integration" keeps its existing "SOON" labeling.
- **FR-008**: Every CTA (hero, nav, final section) MUST navigate to its correct existing route (sign-up, log-in, or Browse) per User Story 2.
- **FR-009**: This feature MUST add `applications.acceptedAt` (new, nullable timestamp), set by Inbox's (`011`) existing `accept-request.ts` alongside its `status` transition to `accepted`, to support the "parties formed this week" stat.
- **FR-010**: Footer links to About/Privacy/Terms MUST point at the three system `ContentPage` rows Admin Content Pages (`021`) seeds; links to Community Guidelines/Careers/Safety Center point at plain custom-page slugs this feature does not itself seed.

### Key Entities

- **Applications**: Extends `006-listing-detail`'s (extended by `011`, `022`) existing table with `acceptedAt` (nullable timestamp, new) — set once, alongside the existing `pending → accepted` transition.
- No other new entities — every other number/list this feature shows reuses an existing table's data (postings, user, ContentPage).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of unauthenticated visits to `/` show this feature's content, never a redirect to `/login` and never Home's authenticated content.
- **SC-002**: 100% of authenticated visits to `/` remain completely unaffected by this feature.
- **SC-003**: 100% of numbers/stats shown anywhere on this page are computed from real, current data at render time — 0% are fabricated or hardcoded placeholders (testimonials excepted, per Input's reasoned distinction).
- **SC-004**: 100% of this page's CTAs navigate to the correct existing route.
- **SC-005**: 100% of "parties formed this week" counts are accurate against `applications.acceptedAt` within the trailing 7 days.

## Assumptions

- The shared nav bar/footer shell (aside from this feature's own footer link content) is Design System infrastructure, out of this feature's own scope, same as every prior feature.
- Testimonial copy is fixed, hand-authored marketing content, not backed by a real review/feedback system — a deliberate, reasoned exception to this project's no-fake-data discipline (see Input), not an oversight.
- Community Guidelines/Careers/Safety Center pages are not seeded by this feature — they're ordinary custom `ContentPage` rows an admin creates later via Admin Content Pages (`021`) whenever real copy exists for them.
- `applications.acceptedAt` is this feature's only schema change — a small, bounded addition to an existing table, not a new entity, needed solely because no prior feature captured "when" an application was accepted, only "that" it was.
- This feature does not touch Home's (`003`) authenticated-visitor behavior in any way beyond replacing its previously-temporary unauthenticated-redirect placeholder.
