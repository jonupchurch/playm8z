# Feature Specification: Forum index

**Feature Branch**: `009-forum-index`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Forum index feature for playm8z: the community forum's landing page at `/forum`, public to view per resources/sitemap.md (posting requires login, matching the original 'Forum (logged-in only)' framing applying to writing, not reading). Source of truth: resources/wireframes/playm8z - Forum.dc.html. Six fixed categories (General, Looking for Group, Game Talk, Tabletop & TTRPG, Groups & Clans, Off-Topic) as a hardcoded set, not a database table -- consistent with how vibe/platform/region were handled as enums elsewhere, not lookup tables. The 'Groups & Clans' category is just a discussion topic tag; it doesn't require the deferred Groups feature to exist. Thread list: search, category filter, sort (Latest/Top/Unanswered), pinned-always-first, a PINNED or HOT badge. Right rail: community stats (members, threads -- both real counts; 'online' is dropped, no presence system exists per Home's and Profile's own prior decisions), trending tags, and creating a new thread via a modal (reusing the Block-modal-established dialog pattern from Blocked Users). The wireframe's 'Join the Discord' widget is dropped entirely -- Discord integration is already-decided future state, so this feature doesn't depict a working connect button. Viewing a single thread and replying to it is a separate, not-yet-spec'd feature (Forum Thread); this feature only covers the index/browse/create-thread surface. Since forum threads accumulate indefinitely (unlike Home's small recent slice), filtering follows Browse's precedent: server-side, URL-search-param-driven, not client-side."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Any visitor browses, searches, and filters threads (Priority: P1)

Any visitor, logged in or not, browses the forum by category, searches by keyword, sorts (Latest / Top / Unanswered), and sees pinned threads always first with community stats and trending tags alongside.

**Why this priority**: The entire reason the forum index exists — reading is what most visitors do most of the time, and it works without ever creating a thread.

**Independent Test**: Select a category, confirm the list narrows to it with an accurate count; search a keyword; switch sort order and confirm pinned threads stay first regardless.

**Acceptance Scenarios**:

1. **Given** any visitor on the forum index, **When** they select a category (or "All"), **Then** the thread list narrows to it, and each category chip shows an accurate thread count.
2. **Given** the thread list, **When** the visitor searches by keyword, **Then** it narrows to threads whose title, snippet, author, or tags match, combined with the active category (AND).
3. **Given** the thread list, **When** the visitor changes sort among Latest / Top (most liked) / Unanswered (zero replies), **Then** the order changes accordingly, with pinned threads always appearing first regardless of sort.
4. **Given** the right rail, **When** it renders, **Then** it shows accurate member and thread counts and a trending-tags list derived from current thread tags; selecting a trending tag narrows the list to it.
5. **Given** a category with no threads, **When** it's viewed, **Then** an empty state appears with a "Be the first to start the conversation" message and a path to create one.

---

### User Story 2 - Verified user creates a new thread (Priority: P2)

An authenticated, email-verified visitor opens the New Thread modal, picks a category, writes a title and body (plus optional tags), and posts it — appearing immediately at the top of its category (subject to normal sort rules).

**Why this priority**: Necessary for the forum to have any content at all, but secondary to browsing/reading (US1) in day-to-day usage — most visits don't create a thread.

**Independent Test**: As a verified user, open New Thread, fill in category/title/body, post, and confirm the new thread appears in its category's list immediately.

**Acceptance Scenarios**:

1. **Given** a verified user, **When** they open New Thread and submit a category, title, and body (tags optional), **Then** a new thread is created and appears in its category's list right away.
2. **Given** an unauthenticated visitor, **When** they attempt to open New Thread, **Then** they're routed to log in first.
3. **Given** an authenticated but unverified user, **When** they attempt to post a new thread, **Then** it's blocked with a message directing them to verify their email first (consistent with every other write action).

---

### Edge Cases

- What happens to the wireframe's "892 online" community stat? → Dropped — no presence-tracking system exists anywhere in this project (Home and Profile both already made this same call for their own decorative "online" elements).
- What happens to the wireframe's "Join the Discord" widget? → Dropped entirely — Discord integration is already-decided future state; this feature doesn't depict a working connection.
- What happens to the "HOT" badge? → Computed at read time from recent activity (a simple, transparent heuristic — see research.md), not a stored flag a moderator sets; "PINNED" is a stored, moderator-controlled flag this feature only reads (the future Admin Forum feature owns setting it).
- What happens when a thread is locked? → Out of this feature's scope beyond display — locking is the future Admin Forum feature's action; this feature would show a locked indicator if a thread happens to be locked, but doesn't lock/unlock anything itself.
- What happens to the "Groups & Clans" category given Groups itself is deferred platform-wide? → It's just a discussion-topic tag people can post under; it doesn't require the Groups feature (guilds/clans as a real system) to exist.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let any visitor, authenticated or not, browse and search forum threads — no login required to read.
- **FR-002**: System MUST offer the six fixed categories (General, Looking for Group, Game Talk, Tabletop & TTRPG, Groups & Clans, Off-Topic) plus "All," each showing an accurate thread count.
- **FR-003**: System MUST narrow the thread list to threads whose title, snippet/body, author, or tags match an entered keyword, combined (AND) with the active category.
- **FR-004**: System MUST offer a sort control (Latest / Top / Unanswered), with pinned threads always appearing first regardless of the selected sort.
- **FR-005**: Each thread row MUST show a PINNED badge (if the moderator-set flag is true) or a HOT badge (if it meets the recency/activity heuristic — research.md), never both, and never neither unless it qualifies for neither.
- **FR-006**: System MUST show accurate member and thread counts, and a trending-tags list derived from current thread tags (recalculated per request, same pattern as Home's Trending row and Browse's Game facet); selecting a trending tag applies it as the search term.
- **FR-007**: When a category (or the current search) has no matching threads, system MUST show an empty state with a path to create the first one.
- **FR-008**: System MUST let an authenticated, email-verified visitor create a new thread (category, title, body, optional tags) via a modal; it MUST appear in its category's list immediately.
- **FR-009**: A visitor who is not authenticated MUST be routed to log in before creating a thread; an authenticated but unverified visitor MUST be blocked with a message directing them to verify their email first.
- **FR-010**: This feature MUST NOT build viewing a single thread or replying to it — that's the separate, not-yet-spec'd Forum Thread feature's scope; selecting a thread row should link to that feature's route even though it doesn't exist yet.

### Key Entities

- **ForumThread**: New entity this feature introduces (as its first writer) — `categoryId` (one of the six fixed keys), `authorId`, `title`, `body`, `tags[]`, `pinned` (moderator-controlled, read-only here), `locked` (moderator-controlled, read-only here), `replyCount`, `viewCount`, `likes`, `createdAt`. This feature only ever creates threads with default values (`pinned`/`locked` false, counts zero) — it never sets the moderator-controlled fields to anything else.
- **Category**: Not a stored entity — a small, fixed, hardcoded set of six keys/labels, consistent with how vibe/platform/region are handled elsewhere in this project.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any visitor, logged in or not, can browse and search the full thread list without being prompted to authenticate.
- **SC-002**: 100% of category/search/sort combinations produce an accurate, correctly-ordered result set, with pinned threads always first.
- **SC-003**: 100% of new threads appear in their category's list immediately after posting.
- **SC-004**: 100% of thread-creation attempts by an unverified user are blocked with a message telling them what to do next.
- **SC-005**: Member/thread counts and trending tags are always current as of the request, never a stale or hardcoded snapshot.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- Reading the forum requires no authentication (`resources/sitemap.md`'s 🌐 marking); only creating a thread is gated — matching the original product description's "Forum (logged-in only)" framing to writing, not reading.
- Categories are a small, fixed, hardcoded set (not a database table) — consistent with how this project has handled other small enumerated sets (vibe, platform, region) throughout.
- "Online" member count and the "Join the Discord" widget are both dropped from the wireframe — no presence system exists (Home/Profile already made this call), and Discord integration is already-decided future state.
- "HOT" is computed at read time from recent reply/view activity, not a stored flag — a transparent heuristic (research.md), distinct from "PINNED," which is a real, moderator-controlled stored field this feature only reads (the future Admin Forum feature sets it).
- Locking a thread is entirely the future Admin Forum feature's action; this feature only displays a locked indicator if the field happens to be true, never sets it.
- Thread creation follows Browse's server-side, URL-driven filtering precedent rather than Home's client-side approach, since forum threads accumulate indefinitely rather than staying a small recent slice.
- Selecting a thread links toward the not-yet-spec'd Forum Thread feature's route; until that feature exists, following the link is expected to hit Error Pages' 404 state, which is itself correct behavior for a route that doesn't exist yet.
