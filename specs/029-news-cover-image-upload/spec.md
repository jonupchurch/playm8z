# Feature Specification: Real Image Upload for News Post Covers

**Feature Branch**: `029-news-cover-image-upload`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "In the news feed, you can pick a color for the block but can't pick an image for it. Please allow us to pick an image." Scoped to the Admin News editor's Cover field only (feature 020) — the existing 4 gradient color swatches stay as an option; this adds a real uploaded image as an alternative, reversing feature 020's own prior "no real imagery yet" scope decision for this one field. Storage via Vercel Blob, matching this project's existing platform-native pattern (Neon via Marketplace, AI Gateway via ADR 0007).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a real cover image instead of picking a color (Priority: P1)

A moderator-or-higher editing a News post wants the cover to be an actual photo/graphic they upload, not just one of four preset gradient colors — and wants that real image to show up correctly everywhere the post's cover already appears across the site (the News feed, the featured post, the article page itself, related-articles, and a reader's Saved tab), exactly the same way the gradient swatches do today.

**Why this priority**: This is the entire feature. Without it there is nothing else to build, and a real image that only displays in one place while breaking or looking wrong everywhere else isn't a usable feature.

**Independent Test**: Upload an image as a new or existing post's cover, save/publish it, then visit every surface that shows a News post's cover (feed, featured, article detail, related, Saved tab) and confirm the real image renders correctly in each, exactly where the gradient used to render.

**Acceptance Scenarios**:

1. **Given** a moderator-or-higher is editing a News post's Cover field, **When** they upload a valid image file, **Then** it replaces the live preview immediately, and the four gradient swatches remain visible as an alternative they can still switch back to.
2. **Given** an image has been uploaded and the post is saved/published, **When** any visitor views the News feed, the featured post, the article's own page, its appearances in "Keep reading"/related lists, or a reader's Profile Saved tab, **Then** the real uploaded image renders in every one of those places, not a broken image or a fallback gradient.
3. **Given** a post already has an uploaded cover image, **When** the moderator uploads a new image, **Then** the new image replaces the old one everywhere the cover appears.
4. **Given** a post already has an uploaded cover image, **When** the moderator instead clicks one of the four gradient swatches, **Then** the post's cover reverts to that gradient (the uploaded image is no longer used).
5. **Given** an already-published post that has always used a gradient (never an uploaded image), **When** this feature ships, **Then** that post's appearance is completely unchanged everywhere.
6. **Given** a moderator selects a non-image file, or an image file larger than the allowed size, **When** they attempt to upload it, **Then** it is rejected with a clear error and the post's existing cover (gradient or previous image) is left completely untouched.

### Edge Cases

- An upload fails mid-transfer (e.g. a dropped connection): the existing cover is left exactly as it was; a clear error is shown, not a silent failure or a half-applied change.
- A moderator uploads an unusually large but still-valid image: it is still subject to the same maximum file size as any other upload — rejected the same way as any oversized file, not given special handling.
- A moderator navigates away mid-upload without saving: the post's persisted cover is whatever it already was before the upload attempt (uploading alone doesn't persist anything — the page's existing Save/Publish action is still what actually stores the change, same as every other field on this editor).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Admin News editor's Cover field MUST offer uploading a real image as an alternative to the four existing gradient color swatches — both options MUST remain available side by side.
- **FR-002**: An upload MUST be validated as an actual image file (JPEG, PNG, or WebP) before it is accepted; any other file type MUST be rejected with a clear error and no change to the post's existing cover.
- **FR-003**: An upload MUST be rejected if it exceeds a maximum file size, with a clear error and no change to the post's existing cover.
- **FR-004**: An uploaded image MUST be stored durably and referenced by the same underlying field the gradient swatches already use, so every existing reader/consumer only ever needs one field to determine a post's cover.
- **FR-005**: Every existing surface that displays a News post's cover (News feed cards, the featured post, the article's own page, related-article lists, Profile's Saved tab, and the admin list's thumbnail) MUST correctly render either a gradient or an uploaded image, whichever the post actually has — with zero visual change for any post that has always used a gradient.
- **FR-006**: A moderator-or-higher MUST be able to replace an already-uploaded cover image with a new upload, or switch back to a gradient swatch, at any time.
- **FR-007**: Uploading/replacing a cover image MUST be gated exactly the same as the rest of the Admin News editor (moderator-or-higher) — no stricter or looser gate than the page already has.
- **FR-008**: The system MUST show a clear in-progress indicator while an upload is running, and MUST leave the existing cover completely unmodified if the upload fails.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A moderator can upload and preview a real cover image for a News post in under 10 seconds on a typical connection.
- **SC-002**: Every surface that displays a News post's cover renders correctly for both a gradient-based post and an image-based post — zero broken images, zero layout regressions.
- **SC-003**: 100% of invalid uploads (wrong file type or over the size limit) are rejected with a clear message; none are ever silently accepted.
- **SC-004**: 100% of already-published posts that use a gradient cover are visually unchanged after this feature ships.

## Assumptions

- Accepted image formats are JPEG, PNG, and WebP — standard web image types; no other format (e.g. SVG, GIF, HEIC) is accepted in this initial version.
- A maximum file size of 5MB is used as a reasonable default for a web cover image; not specified by the user, adjustable later if it proves too strict or too loose.
- No image cropping/editing tool is part of this feature — an uploaded image is displayed as-is (covering its container, same as the existing gradient treatment), matching how every other "no rich editor" scope line has been drawn project-wide.
- Replacing an uploaded image does not attempt to delete the old file from storage in this initial version (avoiding building a cleanup mechanism for v1); low-stakes at this project's current scale, revisit if storage growth ever becomes a real concern.
- Scope is intentionally narrow to the News Cover field only — other color-swatch-based surfaces in the app (e.g. profile avatar colors) are explicitly not touched by this feature and would need their own separate scoping if ever revisited.
