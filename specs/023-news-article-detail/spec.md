# Feature Specification: News Article detail

**Feature Branch**: `023-news-article-detail`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "News article detail page at `/news/:slug`. Source of truth: resources/wireframes/playm8z - News Article.dc.html and resources/guidelines.md. Reading-progress bar, article meta (category/date/read time), title, author byline, Like/Save/Share row, cover image, full markdown body rendered as HTML, tags, share row, 'Keep reading' related-articles grid, and a newsletter-subscribe box. Public (no auth needed to read); Like/Save require an authenticated, email-verified session, consistent with every other write action.

Reconciliations against already-established decisions:
- `NewsPost` (013, extended by Admin News 020) has no `slug` column -- both prior features only ever needed `id`. This feature adds `slug` (unique, not null) and a small, bounded amendment to Admin News' (020) `save-news-post.ts`, generating a human-legible, collision-safe unique slug from the title at CREATION time only (same numeric-suffix approach already used for Admin Content Pages', 021, `create-content-page.ts`) -- a slug never changes after creation, even if the title is later edited, keeping article URLs permanent (the same reasoning already applied to handle immutability). Also a small, bounded amendment to News feed's (013) card rendering, linking each card to `/news/{slug}` -- 013 never specified this linking itself, since this feature didn't exist yet when it was spec'd.
- A NewsPost must be actually live to render here (`status = 'published'`, or `scheduled` with a passed publish date/time) -- the exact same computed-at-read-time rule Admin News (020) already added to News feed's (013) own query. A non-live slug (draft, not-yet-due scheduled, or nonexistent) renders as not-found (Error Pages, 002) for a regular visitor -- the same 'a draft is indistinguishable from a nonexistent slug for non-admins' precedent Content Page (014) already established.
- 'Read time' is NOT read from `013`'s existing (nullable, never-populated) `readTimeMinutes` column -- no feature has ever wired a UI control to set it (Admin News' editor has no such field). This feature computes it directly from the article body's word count at render time instead (computed, not stored, the project's now-standard preference) -- `readTimeMinutes` itself is left as unused dead weight, a cleanup noted but out of this feature's own scope to remove.
- 'Like' reuses Forum Thread's (010) existing polymorphic `likes` table directly, adding `targetType = 'newsPost'` to its existing `thread` | `reply` values -- this feature is simply its third consumer/target type, not a new like-tracking mechanism.
- 'Save' is NOT folded into the existing posting-specific `SavedListing` (007) -- with only two total consumers (postings, now news posts) this doesn't yet meet the 'generalize when a THIRD real consumer appears' bar this project applied to `warnings`' own polymorphic generalization, so this feature introduces a small, separate `savedNewsPosts` table instead of prematurely reshaping `SavedListing`. Includes a small, bounded amendment to Profile's (007) Saved tab, adding a second 'Saved articles' section reading from this new table -- without a way to ever see your saved articles again, 'Save' would be a write with no real use, the same 'a control needs a real, visible effect' reasoning already applied repeatedly (e.g. Blocked Users' enforcement, Admin Postings' Remove).
- 'Related articles' ('Keep reading') and the newsletter-subscribe box both reuse News feed's (013) existing list-query and `subscribe-newsletter.ts` directly -- no new logic, just this feature's own presentation of them.
- Share buttons (X/LinkedIn/copy-link) are plain client-side link-intents/clipboard actions, no backend -- consistent with Public Profile's (022) own 'Share profile' treatment.
- The reading-progress bar is a pure client-side scroll-position indicator -- no server state, no new entity."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Any visitor reads a news article (Priority: P1)

Anyone (authenticated or not) visits `/news/:slug` and reads the full article: meta, title, author, cover, body, tags, and related articles, with an accurate reading-progress bar.

**Why this priority**: The baseline value of this page — everything else (liking, saving) depends on the article rendering correctly first.

**Independent Test**: Visit a published article's slug as a logged-out visitor and confirm meta/title/body/tags/related-articles/subscribe-box all render correctly, with an accurate computed read time and a working reading-progress bar; visit a draft or not-yet-due scheduled post's slug and confirm not-found.

**Acceptance Scenarios**:

1. **Given** a published `NewsPost`, **When** any visitor loads its `/news/:slug`, **Then** the page shows its category/date/computed-read-time, title, author byline, cover, full body (rendered from markdown), tags, and 3 related articles.
2. **Given** a slug belonging to a draft or not-yet-due scheduled post, or a nonexistent slug, **When** it's visited by a regular visitor, **Then** a not-found response is shown (Error Pages, `002`) — indistinguishable from a slug that never existed.
3. **Given** the article page, **When** the visitor scrolls, **Then** the reading-progress bar accurately reflects scroll position through the article.
4. **Given** the newsletter-subscribe box, **When** a visitor (authenticated or not) submits an email, **Then** it behaves exactly as News feed's (`013`) existing subscribe action.

---

### User Story 2 - An authenticated visitor likes or saves an article (Priority: P2)

A logged-in, email-verified visitor likes an article (toggling a heart count) or saves it for later, and can find it again in their Profile's Saved tab.

**Why this priority**: The core engagement actions this page adds beyond passive reading, but they follow from the article rendering correctly first (US1).

**Independent Test**: Like an article and confirm the count/state persists on reload; save an article and confirm it now appears in Profile's (`007`) Saved tab under a new "Saved articles" section.

**Acceptance Scenarios**:

1. **Given** an authenticated, email-verified visitor, **When** they select "Like," **Then** a `likes` row (`targetType = 'newsPost'`) is created and the count/button state reflects it; selecting it again removes the row and reverts the count.
2. **Given** the same visitor, **When** they select "Save," **Then** a `savedNewsPosts` row is created and the button shows "Saved"; selecting it again removes the row.
3. **Given** a visitor with a saved article, **When** they later visit Profile's (`007`) Saved tab, **Then** a "Saved articles" section lists it, alongside the existing saved-postings list.
4. **Given** an unauthenticated or unverified visitor, **When** they attempt Like or Save, **Then** they're routed to log in or shown a verify-your-email message, respectively, consistent with every other write action.

---

### User Story 3 - A visitor discovers more content via related articles or shares the piece (Priority: P3)

A visitor browses to another article via the "Keep reading" grid, or shares the current one via a link-intent/copy-link action.

**Why this priority**: Discovery/distribution affordances, exercised less often than reading itself (US1) or liking/saving (US2).

**Independent Test**: Confirm the "Keep reading" grid shows 3 other published articles (never the current one); confirm each share button performs its plain client-side action with no backend call.

**Acceptance Scenarios**:

1. **Given** the article page, **When** it renders, **Then** "Keep reading" shows up to 3 other currently-live articles, excluding the current one, reusing News feed's (`013`) existing query.
2. **Given** the share row, **When** a visitor selects a share button, **Then** it performs a plain client-side action (an external share-intent link, or a copy-to-clipboard) with no server round-trip.

---

### Edge Cases

- What happens to `013`'s existing (never-populated) `readTimeMinutes` column? → Left as unused dead weight; this feature computes read time directly from the body instead (see Input) — cleanup is out of scope here.
- What happens when fewer than 3 other live articles exist? → "Keep reading" shows however many exist (including none, with the section simply omitted), never placeholder/fake cards.
- What happens to a slug collision at article creation? → Resolved automatically with a numeric suffix, same as Admin Content Pages' (`021`) own unique-slug generation — this feature never needs to handle a collision itself, since slugs are assigned once at creation by Admin News (`020`).
- What happens if a visitor likes/saves an article, then it's later unpublished by an editor? → Out of this feature's own scope; a `likes`/`savedNewsPosts` row persists regardless of the target's current live status, matching how `SavedListing` already behaves for a since-closed posting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show any visitor a published (or currently-due scheduled) `NewsPost` at `/news/:slug`: category, date, computed read time, title, author byline, cover, full rendered body, and tags.
- **FR-002**: A slug belonging to a draft, not-yet-due scheduled, or nonexistent post MUST show a not-found response (Error Pages, `002`), indistinguishable from each other to a regular visitor.
- **FR-003**: Read time MUST be computed from the body's word count at render time — `013`'s existing `readTimeMinutes` column MUST NOT be read.
- **FR-004**: The reading-progress bar MUST be a pure client-side scroll-position indicator with no server state.
- **FR-005**: An authenticated, email-verified visitor MUST be able to toggle Like (`likes`, `targetType = 'newsPost'`, reused from `010`) and Save (`savedNewsPosts`, new); each control MUST reflect current state.
- **FR-006**: A saved article MUST appear in Profile's (`007`) Saved tab, in a new "Saved articles" section alongside the existing saved-postings list.
- **FR-007**: "Keep reading" MUST show up to 3 other currently-live articles (excluding the current one), reusing News feed's (`013`) existing query logic.
- **FR-008**: The newsletter-subscribe box MUST reuse News feed's (`013`) existing `subscribe-newsletter.ts` Server Action directly.
- **FR-009**: Share buttons MUST perform plain client-side actions (share-intent links or clipboard copy) with no backend call.
- **FR-010**: This feature MUST add `newsPosts.slug` (new, unique, not null) and a small, bounded amendment to Admin News' (`020`) `save-news-post.ts`, generating a collision-safe unique slug from the title once, at creation only (never regenerated on later edits).
- **FR-011**: This feature MUST add a small, bounded amendment to News feed's (`013`) card rendering, linking each card to its `/news/{slug}`.
- **FR-012**: Unauthenticated or unverified attempts at Like/Save MUST be routed to log in or shown a verify-your-email message, respectively, consistent with every other write action.

### Key Entities

- **NewsPost**: Extends `013-news-feed`'s (extended by `020`) existing table. New field: `slug` (text, unique, not null, generated once at creation by `020`'s amended `save-news-post.ts`).
- **Likes**: Reused/extended from Forum Thread (`010`) — this feature is its third `targetType` (`newsPost`, alongside `thread`/`reply`).
- **SavedNewsPosts** (new table): `userId`, `newsPostId`, `createdAt`. A real delete on unsave (no trust/safety history value), same exception as `SavedListing`/`Likes`/`Follows`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of published/currently-due-scheduled article slugs render correctly; 100% of draft/not-yet-due/nonexistent slugs show not-found, indistinguishably.
- **SC-002**: 100% of displayed read times are computed from the actual body content at render time.
- **SC-003**: 100% of Like/Save toggles immediately update their button state and underlying row; 100% of saved articles are subsequently visible in Profile's Saved tab.
- **SC-004**: 100% of "Keep reading" grids show only currently-live, non-current articles.
- **SC-005**: 100% of unauthenticated/unverified Like/Save attempts are handled per FR-012, never a silent failure.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- `013`'s unused `readTimeMinutes` column is left in place, unread by this feature — removing it is an optional future cleanup, not required here.
- `savedNewsPosts` stays a separate table from `SavedListing` rather than a premature generalization — this project's established bar ("generalize when a third real consumer appears," applied to `warnings`) isn't yet met with only two consumers.
- Slugs are immutable once generated at creation (by `020`'s amended action) — editing a post's title later never changes its URL, consistent with handle immutability's own reasoning.
- Liking/saving an article that's later unpublished isn't specially handled — the underlying row simply persists, matching `SavedListing`'s existing behavior for a since-closed posting.
