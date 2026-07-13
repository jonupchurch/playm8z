# Feature Specification: Admin Content Pages

**Feature Branch**: `021-admin-content-pages`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Admin Content Pages feature for playm8z: the ContentPage management list at `/admin/content-pages`. Source of truth: resources/wireframes/admin/playm8z - Admin Content Pages.dc.html and resources/guidelines.md section 8.7. Stats (total/published/drafts/system pages). Search (title/URL) + filters (All/Published/Drafts/System). Table (page icon+title+system badge, URL, status, updated date, actions). Row actions: Publish/Unpublish, View, Edit (-> Content Page's, 014, own inline-edit UI at that page's slug -- this feature never builds a second editing surface), Delete (custom pages only, inline confirm). '+ New page' creates an 'Untitled page' draft with an auto-generated unique slug. Gated on role >= moderator.

Reconciliations against already-established decisions:
- This feature is a thin management LIST wrapping Content Page's (014) already-existing `ContentPage` table and `toggle-page-status.ts` Server Action -- Publish/Unpublish here call that exact same action, not a second implementation. 'Edit' navigates to the page's own public slug, where 014's existing inline-edit affordance (gated by the same role check) already lives -- this feature never builds a second content-editing surface, consistent with guidelines.md's own 'Edit (-> section 7.11)' cross-reference.
- Adds a new `system` (boolean) column to `014`'s `ContentPage` table -- that table never needed to distinguish 'core legal/structural page' from 'custom page' until this feature's list needs to show the 🔒 System badge and gate Delete. A small, bounded schema amendment to an already-merged feature, not a redesign of it.
- The wireframe's 'Delete' (custom pages only), per its own demo JS, literally removes the row -- the same ADR 0005 conflict already resolved identically for Profile, Admin Users, and Admin News. Collapsed into the SAME resolution already used for Admin News: 'Delete' sets `status` back to `draft` (014's existing enum already has this state) rather than a new column or an actual row removal -- consistent, no speculative new value invented. System pages never offer Delete at all (matching the wireframe's own `canDelete` gate), since 014's spec already anticipated 'page deletion... would follow ADR 0005 like everything else.'
- This feature's own migration seeds the three system pages (About Us, Privacy Policy, Terms of Use) as real `ContentPage` rows (`system = true`, `status = published`, minimal placeholder content) -- these are expected to exist from launch (basic legal/structural pages), and no other feature has ever created them; seeding them here (rather than leaving three real-looking table rows to a manual one-off DB edit) is this feature's own bounded Foundational-phase responsibility.
- The wireframe's sidebar shows 'editor' as the signed-in admin's role label -- same normalization already applied in Admin News (020): this project's ratified role model (guidelines.md section 9) is only user/moderator/admin, so this page gates identically to every other `/admin/*` page (moderator minimum), not a distinct 'editor' tier."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Moderator views, searches, and filters the page list (Priority: P1)

A moderator-or-higher user sees accurate stats (total/published/drafts/system) and a searchable (title/URL), filterable (All/Published/Drafts/System) table of every content page.

**Why this priority**: The baseline "what pages exist and what state are they in" view — every other action here starts from finding the right page first.

**Independent Test**: With pages across published/draft/system seeded, confirm the four stats cards match direct counts, search narrows by title or slug, and each filter shows only matching pages.

**Acceptance Scenarios**:

1. **Given** pages across published/draft states, some system-flagged, **When** a moderator-or-higher user views this page, **Then** the four stats cards (total, published, drafts, system) each show an accurate current count.
2. **Given** the table, **When** the moderator searches by title or slug text, **Then** it narrows to matches; selecting a status/system filter narrows further (combined with search).
3. **Given** a visitor without moderator-or-higher access, **When** they attempt to view this page, **Then** they're denied per Error Pages' access-denied behavior.
4. **Given** a search/filter combination with no matches, **When** it renders, **Then** an empty state ("No pages match your search") appears instead of a blank table.

---

### User Story 2 - Moderator publishes, unpublishes, or creates a page (Priority: P2)

A moderator-or-higher user toggles a page's published/draft status directly from its row, or creates a new blank draft page via "+ New page."

**Why this priority**: The core lifecycle-management actions this list exists for, but they follow from having first found the right page (US1).

**Independent Test**: Toggle a published page to draft and back, confirming the status badge and stats update immediately and reusing `014`'s existing toggle action; select "+ New page," confirm a new "Untitled page" draft appears with a unique auto-generated slug, ready to edit.

**Acceptance Scenarios**:

1. **Given** a published page's row, **When** the moderator selects "Unpublish," **Then** its status becomes draft immediately (via `014`'s existing `toggle-page-status.ts`), reflected in the table and stats; selecting "Publish" on a draft page reverses it.
2. **Given** the page list, **When** the moderator selects "+ New page," **Then** a new `ContentPage` row is created (title "Untitled page," a unique auto-generated slug, `status = draft`, `system = false`) and appears in the list, ready for "Edit."
3. **Given** any row, **When** the moderator selects "View" or "Edit," **Then** they're taken to that page's own public slug — "Edit" arriving there with `014`'s existing inline-edit affordance available (same role gate), not a second editing UI.

---

### User Story 3 - Moderator deletes a custom page (Priority: P3)

A moderator-or-higher user removes a custom (non-system) page from active use via an inline-confirm Delete action.

**Why this priority**: A less frequent, more consequential action than routine publish/unpublish (US2) or browsing (US1) — most pages are never deleted.

**Independent Test**: Select Delete on a custom page, confirm an inline "Delete? Yes/No" prompt appears in place of the row's normal actions, confirm it; the page's status becomes draft (never removed) and it disappears from the public site. Confirm a system page never offers Delete at all.

**Acceptance Scenarios**:

1. **Given** a custom (non-system) page's row, **When** the moderator selects the delete icon, **Then** an inline confirmation ("Delete? Yes/No") replaces that row's normal actions.
2. **Given** the inline confirmation, **When** the moderator confirms, **Then** the page's `status` becomes `draft` (ADR 0005 — never a hard delete) and it no longer appears on the public site, while remaining in this feature's own list, editable and re-publishable; selecting "No" cancels, restoring the normal row actions.
3. **Given** a system-flagged page's row, **When** it renders, **Then** no delete affordance is offered at all (a 🔒 indicator appears in its place, matching the wireframe).

---

### Edge Cases

- What happens to the wireframe's "editor" role label? → Normalized to the existing moderator-minimum gate, same as Admin News (`020`); not a real distinct role.
- What happens to "Delete"? → Collapses into setting `status = draft`, never a hard delete — the same resolution already used for Admin News' own Delete-as-Unpublish.
- What happens to a newly-created page's slug if "untitled-page" is already taken? → A numeric suffix is appended (e.g. `/untitled-page-2`) to guarantee uniqueness, since `slug` is a database-level unique column (`014`).
- What happens to the three system pages (About Us, Privacy Policy, Terms of Use) if they don't already exist? → This feature's own migration seeds them as real, published `ContentPage` rows with `system = true` and minimal placeholder content — no other feature creates them.
- What happens when a moderator unpublishes a system page? → Allowed (matching the wireframe's own unrestricted Publish/Unpublish toggle for system rows) — only Delete is blocked for system pages, not status changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role ≥ moderator (`require-role.ts`) to view or act on this page; a visitor without that access MUST be denied.
- **FR-002**: System MUST show four stats cards (total, published, drafts, system pages), each an accurate current count.
- **FR-003**: System MUST show a searchable (title/slug) and status/system-filterable (All/Published/Drafts/System) table of every `ContentPage`, each row showing its icon/title/system badge, URL, status, and last-updated date.
- **FR-004**: "Publish"/"Unpublish" MUST call `014`'s existing `toggle-page-status.ts` Server Action — no second status-toggle implementation.
- **FR-005**: "View" MUST navigate to the page's public slug; "Edit" MUST navigate to the same slug, where `014`'s existing inline-edit affordance is available to a moderator-or-higher session — this feature never builds a second content-editing UI.
- **FR-006**: "+ New page" MUST create a new `ContentPage` (title "Untitled page," a unique auto-generated slug, `status = draft`, `system = false`).
- **FR-007**: "Delete" MUST be offered only for non-system pages, via an inline "Delete? Yes/No" confirmation; confirming MUST set that page's `status` to `draft` (never remove the row, ADR 0005).
- **FR-008**: System pages (`system = true`) MUST never offer a Delete affordance.
- **FR-009**: This feature MUST add `ContentPage.system` (new boolean column, default `false`) and seed the three system pages (About Us, Privacy Policy, Terms of Use) as real, published rows with `system = true`.
- **FR-010**: A search/filter combination matching no pages MUST show an empty state, never a blank table.

### Key Entities

- **ContentPage**: Extends `014-content-page`'s existing table. New field: `system` (boolean, not null, default `false`) — distinguishes core legal/structural pages (Delete never offered) from custom pages (fully manageable). This feature is the first writer of new rows (via "+ New page") and reuses `014`'s existing `status`/`toggle-page-status.ts` for both Publish/Unpublish and Delete-as-draft.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of stats-card counts and table rows reflect accurate, current `ContentPage` data.
- **SC-002**: 100% of Publish/Unpublish actions immediately update that page's status everywhere it's shown (table, stats, public visibility) via `014`'s existing mechanism.
- **SC-003**: 100% of Delete confirmations result in `status = draft`, never a removed row; 0% of system pages ever expose a Delete control.
- **SC-004**: 100% of newly-created pages get a unique slug with no manual collision handling required.
- **SC-005**: 100% of visitors without moderator-or-higher access are denied, never shown this page's content.

## Assumptions

- The admin sidebar shell is Design System infrastructure, out of this feature's own scope, same as every prior admin feature.
- "Editor" in the wireframe's sidebar is demo flavor text, not a ratified distinct role — gates identically to every other `/admin/*` page.
- Reusing `014`'s `toggle-page-status.ts` for both Publish/Unpublish and (as a plain "set to draft") Delete means this feature has a direct dependency on `014` already existing when implementation begins — acceptable since the project-wide gate requires every feature specced before any implementation, and `014` is numerically and dependency-wise earlier.
- Unpublishing a system page is allowed (not blocked) — only Delete is restricted for system pages, matching the wireframe's own unrestricted status-toggle behavior.
- This feature's own migration is responsible for seeding the three system pages — no other feature creates them, and they're expected to exist from initial launch, not as an admin's first manual action.
