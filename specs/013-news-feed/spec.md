# Feature Specification: News feed

**Feature Branch**: `013-news-feed`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "News feed feature for playm8z: the public news/updates page at `/news`. Source of truth: resources/wireframes/playm8z - News.dc.html. A single featured/pinned post (shown large, only when no filter/search is active), category filters (Announcement/Update/Event/Community/Patch Notes, a hardcoded set like Forum's categories), search, a paginated ('Load more') grid of post cards, and a newsletter-subscribe strip. This feature is entirely read-only for posts -- creating/editing/featuring a NewsPost is the future, not-yet-spec'd Admin News feature's job (this feature's own data model just defines the minimal read-side shape, same pattern as Home defining Postings' minimal shape for Post a Game to extend). Newsletter subscription stores an email address only -- no real sending pipeline exists (Resend is still blocked on domain ownership, per Auth & Onboarding's already-logged blocker), matching the same 'store the preference, no delivery mechanism yet' pattern Forum Thread's ThreadSubscription already established. Subscribing requires no login (any visitor can enter an email), unlike every other write action in this project, since it isn't tied to a user account at all."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Any visitor browses, searches, and filters news posts (Priority: P1)

Any visitor reads the featured post, filters by category, searches by keyword, and loads more posts as needed.

**Why this priority**: The entire reason this page exists — reading is what every visitor to `/news` does; nothing else here matters without it.

**Independent Test**: View the page and confirm the featured post shows only when no filter/search is active; select a category and confirm the featured post disappears and the grid narrows; search a keyword and confirm results narrow further; select "Load more" and confirm additional posts append.

**Acceptance Scenarios**:

1. **Given** no active filter or search, **When** the page loads, **Then** the single featured post (the one currently marked featured) renders prominently, and the grid below excludes it.
2. **Given** any category filter or a non-empty search, **When** applied, **Then** the featured post is no longer shown separately, and the grid reflects the combined filter/search (AND semantics).
3. **Given** more posts exist than the initial page shows, **When** the visitor selects "Load more," **Then** the next batch appends to the grid without losing the current filter/search state.
4. **Given** a filter/search combination matching nothing, **When** it renders, **Then** an empty state appears ("No posts here yet") instead of a blank grid.

---

### User Story 2 - Any visitor subscribes to the newsletter (Priority: P2)

Any visitor, without needing an account, enters their email in the subscribe strip to receive future updates.

**Why this priority**: A lightweight capture mechanism, useful but not the reason anyone visits this page — most visits are just reading (US1).

**Independent Test**: Enter a valid email in the subscribe strip and submit; confirm a subscriber record now exists; attempt with a malformed email and confirm it's rejected.

**Acceptance Scenarios**:

1. **Given** a visitor (logged in or not), **When** they submit a validly-formatted email to the subscribe strip, **Then** a subscriber record is created — no account or login required.
2. **Given** a malformed email, **When** submitted, **Then** it's rejected with a clear message, and no record is created.
3. **Given** an email already subscribed, **When** submitted again, **Then** no duplicate record is created (the existing subscription simply stands).

---

### Edge Cases

- What happens if no post is currently marked featured? → The page simply shows the grid without a featured section — this feature doesn't require exactly one to always exist.
- What happens to actually sending newsletter emails? → Out of this feature's scope — only the subscriber's email is stored; real sending depends on a transactional/marketing email provider, which is blocked on domain ownership (the same blocker Auth & Onboarding already logged) and isn't built here.
- What happens to creating, editing, or featuring a NewsPost? → Entirely out of this feature's scope — that's the future, not-yet-spec'd Admin News feature's job; this feature only reads.
- What happens to the "Upcoming" badge on Event-category posts? → Reflects a stored flag the future Admin News feature sets when authoring an Event post — this feature only displays it, never computes or sets it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let any visitor, authenticated or not, browse news posts — no login required.
- **FR-002**: System MUST show the single currently-featured post prominently, but only when no category filter or search is active; applying either MUST hide the featured section and fold that post into ordinary filtering if it matches.
- **FR-003**: System MUST offer category filters (Announcement, Update, Event, Community, Patch Notes, plus "All") and a keyword search over title/excerpt/category, combined with AND semantics.
- **FR-004**: System MUST paginate results with a "Load more" action that appends the next batch without resetting the current filter/search state.
- **FR-005**: A filter/search combination matching nothing MUST show an empty state, never a blank grid.
- **FR-006**: System MUST let any visitor (no account required) submit an email to a newsletter-subscribe strip, validating its format and rejecting malformed input, and MUST NOT create a duplicate subscriber record for an already-subscribed email.
- **FR-007**: This feature MUST NOT implement creating, editing, or featuring a NewsPost, nor real newsletter email delivery — both are out of scope (see Assumptions).

### Key Entities

- **NewsPost**: This feature only reads it (its minimal shape: `title`, `excerpt`, `category`, `cover`, `readTimeMinutes`, `featured` (at most one true, admin-controlled), `upcoming` (Event posts only, admin-set), `publishedAt`). The future Admin News feature is its canonical writer and may extend this shape (e.g., full body content) for its own needs.
- **NewsletterSubscriber**: New entity this feature introduces — `email`, `createdAt`. No relationship to `user` — subscribing doesn't require an account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any visitor, logged in or not, can browse and search news posts without being prompted to authenticate.
- **SC-002**: 100% of the time, the featured post shows exactly when no filter/search is active, and never alongside one.
- **SC-003**: 100% of "Load more" actions preserve the current filter/search state while appending results.
- **SC-004**: 100% of valid-format email submissions create exactly one subscriber record, never a duplicate for the same address; 100% of malformed submissions are rejected.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- Categories are a small, fixed, hardcoded set (not a database table), consistent with how Forum index and other small enumerated sets are handled throughout this project.
- Creating, editing, and featuring a `NewsPost` (including ensuring at most one is featured) is entirely the future Admin News feature's responsibility — this feature only defines the minimal read-side shape it needs, the same pattern Home used for `postings` before Post a Game existed.
- Newsletter subscription stores an email only, with no real sending pipeline — consistent with Forum Thread's `ThreadSubscription` precedent (store the preference, no delivery mechanism yet) and blocked on the same domain-ownership issue Auth & Onboarding already logged for transactional email.
- Subscribing requires no authentication, unlike every other write action in this project, since it's a marketing capture tied to a raw email address, not a user account.
- "Upcoming" is a stored, admin-set flag on Event-category posts, not derived from date math — this feature only displays it.
