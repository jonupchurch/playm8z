# Feature Specification: Content Page

**Feature Branch**: `014-content-page`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Content Page feature for playm8z: a generic, slug-based public page (e.g. Community Guidelines, Terms, About) at `/pages/:slug`, rendered from an ordered list of typed blocks (Heading, Paragraph, List, Quote, Callout, Divider), with inline editing for moderators/admins directly on the public page itself -- no separate admin editor screen. Source of truth: resources/wireframes/playm8z - Content Page.dc.html. Editing is gated on role >= moderator (reusing Error Pages' require-role.ts, its first real consumer), matching the sitemap's '/admin/* -- role >= moderator' convention extended to this inline-edit capability. Entering edit mode holds all block add/remove/reorder/edit operations in local state only; 'Save changes' persists the whole block array + title atomically, 'Cancel' discards it -- matching the wireframe's own batched-edit behavior exactly (not per-keystroke autosave). Blocks are stored as a single ordered JSON array on the page row, not a normalized per-block table, since they're always read and written together as one unit, never queried independently. This feature edits an EXISTING page's content/blocks/publish-status inline; creating a brand-new page (choosing its slug) is the future, not-yet-spec'd Admin Content Pages feature's job. A non-admin visitor requesting a slug that doesn't exist, or one that exists but is unpublished (draft), sees Error Pages' 404 state -- a draft is treated as 'not there yet' for the public, same as a genuinely missing slug."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Any visitor reads a published content page (Priority: P1)

Any visitor, logged in or not, requests a content page's URL and reads its rendered blocks (headings, paragraphs, lists, quotes, callouts, dividers).

**Why this priority**: The entire reason these pages exist — informational content (guidelines, terms, about) needs to be readable by anyone, with no login required.

**Independent Test**: Visit a published page's URL as a logged-out visitor and confirm every block type renders correctly in reading order; visit a nonexistent or unpublished slug and confirm the 404 state instead.

**Acceptance Scenarios**:

1. **Given** any visitor, **When** they request a published page's URL, **Then** its title and every block render in order, correctly formatted per its type (Heading, Paragraph, List, Quote, Callout, Divider) — no login required.
2. **Given** any visitor without moderator-or-higher access, **When** they request a slug that doesn't exist, or one that exists but is currently unpublished, **Then** they see Error Pages' 404 state, not the page's draft content.

---

### User Story 2 - Moderator/admin edits a page's content inline (Priority: P2)

A user with moderator-or-higher access, viewing the page, enters edit mode, adds/removes/reorders/edits blocks and the title, then saves (or cancels, discarding every change).

**Why this priority**: Necessary for the content to ever be created or corrected, but exercised far less often than ordinary reading (US1) — most visits to these pages are visitors reading, not staff editing.

**Independent Test**: As a moderator, enter edit mode, add a new block, reorder two existing ones, edit a paragraph's text, then save; confirm the page reflects every change on reload. Repeat, making changes and selecting Cancel instead; confirm nothing changed.

**Acceptance Scenarios**:

1. **Given** a moderator-or-higher user viewing a page, **When** they select "Edit page," **Then** the page enters edit mode, showing add/reorder/delete controls and editable fields for the title and every block, with no changes yet persisted.
2. **Given** edit mode, **When** the user adds a block (any of the six types), removes one, moves one up or down, or edits a block's text, **Then** these changes are reflected immediately in the edit view but not yet saved.
3. **Given** edit mode with unsaved changes, **When** the user selects "Save changes," **Then** the entire title and block array persists atomically and the page returns to its normal (non-editing) view reflecting every change.
4. **Given** edit mode with unsaved changes, **When** the user selects "Cancel" instead, **Then** every change is discarded and the page returns to its previously-saved state.
5. **Given** a visitor without moderator-or-higher access, **When** they view any page, **Then** no edit controls are shown at all.

---

### User Story 3 - Moderator/admin publishes or unpublishes a page (Priority: P3)

A moderator-or-higher user toggles a page between published and draft status.

**Why this priority**: A real control needed for staging new/updated content before it's public, but exercised far less often than either reading (US1) or ordinary content edits (US2).

**Independent Test**: As a moderator, unpublish a currently-published page and confirm non-admin visitors now see the 404 state for it; publish it again and confirm it's visible to everyone again.

**Acceptance Scenarios**:

1. **Given** a published page, **When** a moderator-or-higher user selects "Unpublish," **Then** its status becomes draft and non-admin visitors requesting its URL now see the 404 state.
2. **Given** a draft page, **When** a moderator-or-higher user selects "Publish," **Then** its status becomes published and it's visible to any visitor again.
3. **Given** any status, **When** a moderator-or-higher user views the page, **Then** they can always see and edit it regardless of published/draft state.

---

### Edge Cases

- What happens to a slug that has never existed at all? → Error Pages' 404 state, same as any other nonexistent route.
- What happens to a draft page for a moderator-or-higher user? → Fully visible and editable — the draft/published distinction only affects non-admin visitors.
- What happens to creating a brand-new content page (choosing its slug)? → Out of this feature's scope — that's the future, not-yet-spec'd Admin Content Pages feature's job. This feature only edits an existing page's content/blocks/status inline.
- What happens if the user navigates away mid-edit without saving or cancelling? → Out of scope to design a beforeunload warning here; unsaved changes are simply lost, consistent with the wireframe's own local-only edit-mode state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let any visitor, authenticated or not, view a published content page's title and ordered blocks — no login required.
- **FR-002**: System MUST render each block type correctly: Heading, Paragraph, List (an ordered set of items), Quote, Callout, and Divider.
- **FR-003**: A visitor without moderator-or-higher access requesting a slug that doesn't exist, or one that exists but is currently unpublished, MUST see Error Pages' 404 state.
- **FR-004**: System MUST let a moderator-or-higher user (reusing Error Pages' `require-role.ts`) enter an inline edit mode directly on the page, showing add/reorder/delete controls and editable title/block fields.
- **FR-005**: While in edit mode, adding, removing, reordering, or editing a block, or editing the title, MUST only affect local (unsaved) state until the user explicitly saves.
- **FR-006**: Selecting "Save changes" MUST persist the entire title and block array atomically and exit edit mode reflecting the saved state.
- **FR-007**: Selecting "Cancel" MUST discard every unsaved change and exit edit mode with the page unchanged.
- **FR-008**: System MUST let a moderator-or-higher user toggle a page between published and draft status; a moderator-or-higher user MUST always be able to view and edit a page regardless of its status.
- **FR-009**: This feature MUST NOT implement creating a brand-new content page or choosing its slug — only editing an existing page's content/blocks/status.

### Key Entities

- **ContentPage**: New entity this feature introduces — `slug` (unique), `title`, `blocks` (an ordered JSON array of typed block objects — Heading/Paragraph/List/Quote/Callout/Divider, each with whatever fields its type needs), `status` (`published` \| `draft`), `updatedAt`. This feature is both its reader and its only writer (for existing pages) at this point — the future Admin Content Pages feature will add page creation and a management list on top of the same table.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of published pages render every block type correctly for any visitor, with no login required.
- **SC-002**: 100% of unpublished or nonexistent slugs show the 404 state to non-admin visitors, never draft content.
- **SC-003**: 100% of "Save changes" actions persist the exact edited state (title + full block array), verifiable on reload.
- **SC-004**: 100% of "Cancel" actions leave the previously-saved state completely unchanged.
- **SC-005**: 100% of publish/unpublish toggles immediately change what non-admin visitors can see, with no delay or caching lag.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- Editing requires moderator-or-higher access, reusing Error Pages' (`002-error-pages`) `require-role.ts` helper — its first real consumer, matching the sitemap's existing `/admin/*` role convention extended to this inline-edit capability.
- Blocks are stored as a single ordered JSON array on the page row, not a normalized per-block table, since they're always read and written together as one atomic unit — never queried or updated independently of the whole page.
- This feature edits an existing page's content, blocks, and publish status only; creating a brand-new page (and choosing its slug) is the future Admin Content Pages feature's scope, which will extend this same `ContentPage` table.
- An unpublished (draft) page is treated identically to a nonexistent slug for non-admin visitors — both show Error Pages' 404 state, never a "coming soon" or distinct draft-preview experience for the public.
- No rich-text/WYSIWYG editor — block text fields are plain text areas (list items newline-separated), matching the wireframe's own simple textarea-based editing, not a formatting toolbar.
