# Feature Specification: Admin News

**Feature Branch**: `020-admin-news`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Admin News feature for playm8z: the News CMS editor at `/admin/news` — this feature's first real writer of News feed's (013) `NewsPost` entity. Source of truth: resources/wireframes/admin/playm8z - Admin News.dc.html and resources/guidelines.md section 8.6. Two-pane layout: left a filterable post list (All/Published/Drafts/Scheduled) with cover thumb, status badge, date, pin indicator, and '+ New'; right an editor (cover color-swatch picker, title, category chips, excerpt, body + a small markdown-snippet toolbar, Publish settings: status segmented control + conditional publish-date field + pin-to-top toggle) with a sticky live feed-preview panel. Footer actions: primary button (label changes with status: Publish now / Update / Schedule), Save draft, Delete (existing posts only). Gated on role >= moderator.

Reconciliations against already-established decisions:
- The wireframe's sidebar shows 'editor' as the signed-in admin's role label -- this project's ratified role model (guidelines.md section 9) is only user/moderator/admin, no separate 'editor' tier. Normalized to the same require-role.ts moderator-minimum gate every other /admin/* page uses -- 'editor' was flavor text for this mockup's demo persona, not a real distinct role.
- The wireframe's 'Delete' button, per its own demo JS, literally removes the row -- this directly violates ADR 0005 (no hard deletes, ever), the same category of conflict already resolved identically for Profile's Deactivate/Delete (007) and Admin Users' Delete (016). Collapsed into 'Unpublish' (sets status back to draft) rather than inventing a new stored 'archived' state -- 'draft' already fully captures 'hidden from the public feed, still exists, still editable,' so no new status value is needed for this to be ADR-0005-safe.
- The wireframe's 📌 'pin to top of feed' toggle is the SAME concept as News feed's (013) already-existing `featured` boolean ('the future Admin News feature is responsible for ensuring at most one post is featured at a time' -- 013's own data-model.md) -- this feature reuses that column directly rather than adding a redundant `pinned` field, and is the feature responsible for that at-most-one invariant 013 deferred to it.
- News feed (013) never actually got a `status`/scheduling concept -- its own data-model explicitly left `NewsPost` 'read-only from this feature' with no writer, so nothing has ever populated a status column. This feature adds `status` (draft|published|scheduled) and `body` (013 explicitly deferred full-content storage to 'the future Admin News feature'). Includes a small, bounded amendment to 013's `search-news.ts`, so the public feed only shows posts that are actually live (`status = 'published'`, OR `status = 'scheduled'` AND its publish date/time has passed) -- computed at read time, no background job flips `scheduled` to `published` automatically (same 'computed, not stored' preference already applied to posting auto-expiry, ADR 0003).
- The body-formatting toolbar (B / i / H2 / link / list) inserts plain markdown snippets into a standard textarea -- not a full WYSIWYG rich-text editor. `body` is stored as plain markdown text; rendering it as HTML is News article detail's (023, not yet spec'd) own concern.
- 'Replace image' (cover) stays decorative/unavailable, consistent with 'no real imagery yet' (guidelines.md section 9) -- the functional cover-selection mechanism is the existing color-swatch picker only, same scope line every prior feature has drawn.
- No per-post author/byline tracking -- the live preview's static 'playm8z team' byline is decorative Design System copy, matching News feed's (013) own lack of any author display; this feature doesn't add an `authorId` column."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editor views and filters the post list (Priority: P1)

A moderator-or-higher user sees every News post in a filterable list (All/Published/Drafts/Scheduled), each row showing its cover, title, status, and date, and selects one to load it into the editor.

**Why this priority**: The baseline "what exists, what state is it in" view every other action in this feature starts from.

**Independent Test**: With posts across all three statuses seeded, confirm each filter narrows the list correctly and selecting a row loads that post's exact data into the editor.

**Acceptance Scenarios**:

1. **Given** posts across draft/published/scheduled statuses, **When** a moderator-or-higher user visits this page, **Then** the list shows every post with an accurate status badge, date, and pin indicator.
2. **Given** the list, **When** the user selects a filter (All / Published / Drafts / Scheduled), **Then** it narrows accordingly.
3. **Given** a list row, **When** the user selects it, **Then** the editor loads that exact post's data (cover, title, category, excerpt, body, status, publish date, pin state).
4. **Given** a visitor without moderator-or-higher access, **When** they attempt to view this page, **Then** they're denied per Error Pages' access-denied behavior.

---

### User Story 2 - Editor creates or edits a post and publishes, schedules, or saves a draft (Priority: P2)

A moderator-or-higher user fills out a post (cover color, title, category, excerpt, body) and either publishes it immediately, schedules it for a future date, or saves it as a draft — with a live preview reflecting their changes as they type.

**Why this priority**: The core authoring workflow this feature exists for.

**Independent Test**: Create a new post, confirm the live preview updates as each field changes, save it as a draft, then reopen it and publish it; separately, schedule a different post for a future date and confirm it doesn't yet appear on the public News feed.

**Acceptance Scenarios**:

1. **Given** the editor (new or existing post), **When** the user changes any field, **Then** the live feed-preview panel reflects the change immediately.
2. **Given** a filled-out draft, **When** the user selects the primary button (labeled "Publish now" for a draft), **Then** the post's status becomes published, its `publishedAt` is set to now, and it appears on the public News feed (`013`).
3. **Given** the editor with "Scheduled" selected and a future publish date set, **When** the user selects "Schedule," **Then** the post's status becomes `scheduled` and it does NOT yet appear on the public News feed until that date/time passes.
4. **Given** any post, **When** the user selects "Save draft," **Then** it's stored with `status = 'draft'` regardless of the status control's current selection, and does not appear on the public feed.
5. **Given** an existing published post, **When** the user edits it and selects the primary button (labeled "Update"), **Then** the change is saved without altering its `publishedAt`.

---

### User Story 3 - Editor pins or unpublishes a post (Priority: P3)

A moderator-or-higher user pins a post to the top of the public feed, or unpublishes an existing post (removing it from public view without deleting it).

**Why this priority**: Secondary controls exercised less often than the core create/publish workflow (US2).

**Independent Test**: Pin a published post and confirm it's the only one so pinned (pinning a second one unpins the first); select "Delete" on an existing post and confirm it becomes an editable draft, no longer visible on the public feed, rather than being removed.

**Acceptance Scenarios**:

1. **Given** an existing post, **When** the user toggles "Pin to top of feed" on, **Then** it becomes the (only) featured post — pinning a different post automatically un-pins the previous one.
2. **Given** an existing published or scheduled post, **When** the user selects "Delete," **Then** its status becomes `draft` (never a hard delete, ADR 0005) and it disappears from the public feed but remains in this feature's own list, editable and re-publishable.

---

### Edge Cases

- What happens to the wireframe's "editor" role label? → Normalized to the existing moderator-minimum gate; not a real distinct role (see Input).
- What happens to "Delete"? → Collapses into "Unpublish" (status → draft), never a hard delete (see Input).
- What happens to "pin"? → Reuses News feed's (`013`) existing `featured` column; this feature enforces the at-most-one-featured invariant `013` deferred to it.
- What happens to a scheduled post whose publish date has passed? → Computed at read time by the public feed's query (`status = 'published'` OR (`status = 'scheduled'` AND its date has passed)) — no background job flips the stored status.
- What happens when "Save draft" is selected while the status control shows "Scheduled" or "Published"? → Always saves as `draft` regardless of the status control's on-screen selection — "Save draft" is an explicit override.
- What happens to the cover "Replace image" control? → Stays decorative/unavailable; only the color-swatch picker is functional (no real image upload exists anywhere yet).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role ≥ moderator (`require-role.ts`) to view or act on this page; a visitor without that access MUST be denied.
- **FR-002**: System MUST show a filterable (All/Published/Drafts/Scheduled) list of every `NewsPost`, each row showing cover, title, status, date, and pin indicator.
- **FR-003**: Selecting a list row MUST load that post's full data into the editor; a "+ New" action MUST load a blank draft.
- **FR-004**: The editor MUST provide cover color selection, title, category (single-select from the fixed five-category set), excerpt, and a markdown-snippet-assisted body textarea.
- **FR-005**: A live preview MUST reflect the editor's current field values as they change, before saving.
- **FR-006**: The primary action MUST publish immediately (new/draft → published, `publishedAt` set to now) or schedule (status → `scheduled`, using the entered publish date) or update in place (existing published post, `publishedAt` unchanged) — its label and behavior MUST match the post's current status per the Input's mapping.
- **FR-007**: "Save draft" MUST always store the post with `status = 'draft'`, regardless of the status control's current on-screen selection.
- **FR-008**: "Pin to top of feed" MUST set this post's `featured` (reused from `013`) to true and MUST clear it on whichever post was previously featured, enforcing at most one featured post at a time.
- **FR-009**: "Delete" (existing posts only) MUST set `status = 'draft'` rather than removing the row (ADR 0005).
- **FR-010**: This feature MUST add a small, bounded amendment to News feed's (`013`) `search-news.ts`, so the public feed only includes posts that are `published`, or `scheduled` with a publish date/time that has already passed — computed at read time.

### Key Entities

- **NewsPost**: Extends `013-news-feed`'s existing table. New fields: `body` (text, full content, markdown), `status` (`draft` \| `published` \| `scheduled`). Reuses `013`'s existing `featured` (for "pin"), `category`, `cover`, `excerpt`, `title`, `publishedAt`. This feature is the table's first real writer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of list filters and rows accurately reflect current `NewsPost` data.
- **SC-002**: 100% of live-preview updates reflect the editor's current, unsaved field values.
- **SC-003**: 100% of Publish/Schedule/Update/Save-draft/Delete actions produce the exact status/`publishedAt`/`featured` effect specified in FR-006 through FR-009.
- **SC-004**: 100% of scheduled posts remain absent from the public News feed until their publish date/time passes, with zero manual intervention required.
- **SC-005**: 100% of visitors without moderator-or-higher access are denied, never shown this page's content.
- **SC-006**: At all times, 0 or 1 `NewsPost` rows have `featured = true`.

## Assumptions

- The admin sidebar shell is Design System infrastructure, out of this feature's own scope, same as every prior admin feature.
- "Editor" in the wireframe's sidebar is demo flavor text, not a ratified distinct role — this feature gates identically to every other `/admin/*` page (moderator minimum).
- `body` is stored as plain markdown text; the formatting toolbar inserts markdown snippets into the textarea rather than driving a rich-text/WYSIWYG editor. Rendering it as HTML for public display is News article detail's (`023`, not yet spec'd) own concern.
- Scheduled-post publication is entirely computed at read time by the public feed's query — no cron/background job exists or is needed to flip a scheduled post's stored status, consistent with how posting auto-expiry (ADR 0003) is handled.
- No per-post author/byline is tracked — the live preview's "playm8z team" byline is static Design System copy, matching News feed's (`013`) own lack of author display.
- "Replace image" (cover) remains decorative/non-functional; only the color-swatch picker works, consistent with "no real imagery yet" project-wide.
