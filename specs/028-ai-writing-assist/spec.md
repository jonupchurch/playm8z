# Feature Specification: Admin-Only AI Writing Assist (News & Content Pages)

**Feature Branch**: `028-ai-writing-assist`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Adding in AI (claude-haiku) to ADMIN only posts of any kind. Forum posts, pages, news, etc. This should be ONLY for admins and should either allow for 'Improve/rewrite' or 'write' from scratch." Scoped down with the user (2026-07-15) to the two admin content-authoring surfaces that actually have an editing UI today -- Admin News and Admin Content Pages. Admin Forum has no authoring/editing surface (moderation-only), so it's explicitly excluded and logged to `docs/future-work.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a first draft from a short topic (Priority: P1)

An admin starting a brand-new News post or Content Page, instead of starting from a blank title/body or blank blocks, types a short topic or prompt and gets back a complete generated draft (News: title, excerpt, and body; Content Page: a set of blocks) that they can then review, edit, and save exactly like any manually-typed draft.

**Why this priority**: This is the higher-value half of the feature -- turning a blank page into a reviewable starting point is the core "AI writing assist" promise. Without it, there's nothing to review or improve in the first place for a brand-new post.

**Independent Test**: On either the Admin News editor or the Admin Content Pages editor, as an admin, enter a topic into the "Write from scratch" control and confirm a complete draft populates the existing form fields, is fully editable, and can be saved through the existing save action unchanged.

**Acceptance Scenarios**:

1. **Given** an admin is creating a new News post with no title/excerpt/body yet, **When** they enter a topic and use "Write from scratch," **Then** the title, excerpt, and body fields populate with a generated draft they can edit before saving.
2. **Given** an admin is creating a new Content Page with no blocks yet, **When** they enter a topic and use "Write from scratch," **Then** a set of blocks populates the editor's existing block list, fully editable (add/remove/reorder/edit) exactly like manually-added blocks.
3. **Given** a generated draft has populated the form, **When** the admin edits it further and uses the page's existing save action, **Then** it saves exactly as any other draft would -- no new save path, no auto-publish.
4. **Given** a logged-in moderator (not admin) or a logged-out visitor reaches either editor, **When** they look for the "Write from scratch" control, **Then** it is not present/usable -- consistent with the rest of the page's admin-only gate.

---

### User Story 2 - Improve or rewrite the admin's own existing draft text (Priority: P2)

An admin who has already drafted some text (a News body, or one Content Page block) wants a revised, improved version of that same text in place, without retyping it from scratch or leaving the editor.

**Why this priority**: Valuable on its own, but depends on there being existing drafted text to improve -- a natural second capability once the editor already has content in it (whether typed by hand or generated via User Story 1).

**Independent Test**: With an existing News body (or an existing Content Page block with text), use "Improve / rewrite" and confirm that specific field's text is replaced with a revised version, with every other field/block left untouched.

**Acceptance Scenarios**:

1. **Given** an admin has drafted News body text, **When** they use "Improve / rewrite," **Then** the body field's text is replaced with a revised version; the title and excerpt are untouched.
2. **Given** an admin has drafted text in one Content Page block, **When** they select that block and use "Improve / rewrite," **Then** only that block's text is replaced; every other block is untouched.
3. **Given** a field or block has no text yet, **When** the admin looks for "Improve / rewrite" on it, **Then** it is unavailable (there is nothing yet to improve) -- "Write from scratch" is the control for an empty starting point.
4. **Given** a logged-in moderator (not admin) or a logged-out visitor, **When** they look for "Improve / rewrite," **Then** it is not present/usable, same as User Story 1.

### Edge Cases

- The AI request fails or times out: the admin sees a clear error and their existing draft (whatever was there before the request) is left completely intact -- never partially overwritten or cleared.
- The admin triggers a second request while one is already in flight for the same field: the control is disabled/unavailable until the first request resolves, preventing overlapping writes to the same field.
- A very short or vague topic is given to "Write from scratch": the system still returns its best attempt at a draft rather than erroring -- there is no minimum-quality gate, since the admin is expected to review and edit regardless.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both AI-assist actions (Write from scratch, Improve/rewrite) MUST be restricted to sessions with the `admin` role specifically -- a `moderator`-or-lower session, or a logged-out visitor, MUST NOT be able to invoke either action, matching Admin Settings' (024) existing admin-only precedent rather than the `moderator` minimum most other admin pages use.
- **FR-002**: "Write from scratch" MUST accept a short topic/prompt from the admin and return a complete generated draft appropriate to the surface: title + excerpt + body for a News post; a set of blocks for a Content Page.
- **FR-003**: "Improve / rewrite" MUST accept the admin's own currently-drafted text for a single target (the News body, or one specific Content Page block) and return a revised version of that same text only.
- **FR-004**: Both actions MUST only populate existing, already-editable draft form fields -- neither may save, publish, or otherwise persist anything on its own. The page's existing save/publish action remains the only way any of this content is ever stored.
- **FR-005**: Both actions MUST be available on both the Admin News editor and the Admin Content Pages editor.
- **FR-006**: The system MUST show a clear in-progress indicator while a request is running, and MUST leave the admin's prior draft completely unmodified if the request fails -- an error is shown instead of a silent failure or a partially-overwritten draft.
- **FR-007**: On Content Pages, "Improve / rewrite" MUST operate on exactly one selected block at a time, matching the editor's existing per-block editing model -- never rewriting multiple blocks in one request.
- **FR-008**: Every completed AI-assist action (either type, either surface) MUST record an audit-log entry (reusing the existing mechanism from Moderator Audit Log, `015`/`025`) noting which admin, which surface, and which action type -- consistent with every other admin content-mutating action already logging one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can go from a blank News post or Content Page to a complete, editable first draft in under 30 seconds of generation time.
- **SC-002**: An admin can revise any single existing draft field/block without any other field or block's content changing.
- **SC-003**: 100% of attempts to use either action by a non-admin session (including logged-out) are denied, with no draft content generated or returned to them.
- **SC-004**: 100% of failed AI requests leave the admin's pre-existing draft exactly as it was before the request -- zero data loss on failure.

## Assumptions

- Admin Forum is out of scope for this feature (see Input above) -- it has no admin authoring/editing surface today for either action to attach to.
- Neither action runs its output back through the site's existing user-generated-content moderation pipeline (banned-phrase filters, auto-flag rules) -- this content is admin-authored, the same trust level as anything an admin already types by hand into these same fields today.
- No special rate limit or usage cap is required for this feature's initial scope, beyond the existing `admin`-only gate; revisit if usage patterns warrant one later.
- The specific AI provider/model wiring (e.g. which SDK, which integration path) is an implementation detail for the planning phase, not a spec-level concern -- this spec only requires that the two actions produce a generated/revised draft, not how that generation is technically performed.
- Category, tags, slug, and publish-status fields on either surface are untouched by either action -- only the free-text content fields described in FR-002/FR-003 are ever populated or replaced.
