# Feature Specification: Post a Game

**Feature Branch**: `005-post-game`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Post a Game feature for playm8z: the listing-creation form at `/post`, with a live preview. Source of truth: resources/wireframes/playm8z - Post a Game.dc.html and resources/guidelines.md section 7.3. Sections: 01 Game (text input + quick-pick suggestions, Genre chips) · 02 Pitch (title 60-char, description 240-char, keywords/tags) · 03 Vibe & setup (Casual/Serious, Platform, Region, Age group, time slots, optional date, Recurring toggle) · 04 Party & comms (Group size + Spots-open steppers with clamping, Mic-required toggle, optional Discord voice link). Every field updates a live listing-card preview; Publish is disabled until game + title are present. Reachable only by authenticated visitors per resources/sitemap.md (🔓 /post). This is the canonical creator of the Posting entity that Home (003-home) and Browse (004-browse) already read — this feature's data model extends the same shared table with the remaining fields (tags, recurring, voiceLink) rather than inventing a new shape. This is also the first feature to actually consume Auth & Onboarding's (001-auth-onboarding) unverified-email write-action gate (its FR-014/FR-017), since creating a posting is exactly the kind of write action that gate exists to block. Age group options must reflect ADR 0002 (18+/21+ only, never the wireframe's 13+ tier). Recurring is descriptive-only per the second gap-pass decision (no scheduling engine) — the toggle just tags the listing, it doesn't generate repeat postings. The wireframe's 'Save as draft' button is not backed by any documented draft state in the Posting data model and is being treated as out of scope for this spec (logged to docs/future-work.md), not part of this feature. The shared top nav/footer are Design System infrastructure, out of this feature's own scope, same as Home and Browse."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verified user publishes a listing that goes live immediately (Priority: P1)

An authenticated, email-verified user fills out the game, pitch, vibe/setup, and party/comms sections, watches the live preview update as they type, and publishes — the listing appears immediately on Home and Browse.

**Why this priority**: This is the entire point of the feature and the supply side of the platform's core loop — without it, Home and Browse have nothing to show.

**Independent Test**: As a verified user, fill in a game and title (the only required fields), publish, and confirm a new open posting exists with the entered values, immediately visible to Home/Browse.

**Acceptance Scenarios**:

1. **Given** a verified user on `/post`, **When** they enter a game and a title, **Then** the Publish action becomes enabled.
2. **Given** the form, **When** the user edits any field (game, genre, title, description, tags, vibe, platform, region, age group, time slots, date, recurring, group size, spots open, mic, voice link), **Then** the live preview card updates immediately to reflect it, using the user's own display name and avatar color.
3. **Given** a valid, filled-in form, **When** the user selects Publish, **Then** a new posting is created with status "open" and is immediately visible on Home and Browse (no moderation delay or approval step).
4. **Given** the Group size and Spots open steppers, **When** the user adjusts them, **Then** spots open is always clamped between 1 and (group size − 1), and reducing group size below the current spots-open value clamps spots open down to fit.

---

### User Story 2 - Unverified or logged-out visitor is blocked appropriately (Priority: P2)

A visitor who isn't logged in is routed to log in before reaching the form; a visitor who is logged in but hasn't verified their email is blocked from publishing, with a clear message pointing them to verify first.

**Why this priority**: A real trust/safety requirement (Auth & Onboarding's FR-014 exists specifically to gate write actions like this one), but the primary value (US1) is what makes the gate worth having in the first place.

**Independent Test**: As a logged-out visitor, request `/post` and confirm redirection to login; as a logged-in but unverified user, attempt to publish and confirm it's blocked with a message directing them to verify their email.

**Acceptance Scenarios**:

1. **Given** a visitor who is not authenticated, **When** they request `/post`, **Then** they are routed to log in instead of seeing the form.
2. **Given** an authenticated user whose email is not yet verified, **When** they attempt to publish, **Then** the action is blocked and they see a message directing them to verify their email first (consuming Auth & Onboarding's FR-014 gate) — no posting is created.

---

### User Story 3 - Invalid or incomplete input is prevented (Priority: P3)

A user tries to publish without a game or title, or enters values outside the allowed bounds (character limits, seat-count clamping), and the system consistently keeps them from creating an invalid listing rather than silently accepting or truncating it unexpectedly.

**Why this priority**: Protects data quality and the integrity of Home/Browse's facets, but it's a guardrail around US1's happy path, not a standalone value on its own.

**Independent Test**: Attempt to publish with the game or title empty (confirm it's prevented), and attempt to type past the title/description character limits (confirm input is capped, not silently truncated after the fact).

**Acceptance Scenarios**:

1. **Given** an empty game field, a non-empty title, **When** the user attempts to publish, **Then** publishing is prevented and no posting is created.
2. **Given** a non-empty game field, an empty title, **When** the user attempts to publish, **Then** publishing is prevented and no posting is created.
3. **Given** the title field, **When** the user types beyond 60 characters, **Then** further input is capped at 60, with a visible remaining-character count.
4. **Given** the description field, **When** the user types beyond 240 characters, **Then** further input is capped at 240, with a visible remaining-character count.

---

### Edge Cases

- What happens to the "Save as draft" action shown in the source wireframe? → Out of scope for this spec — the Posting entity has no documented draft state; see Assumptions and `docs/future-work.md`.
- What happens if the user selects a game name from the quick-pick suggestions and then edits it further? → The text field simply reflects whatever was last typed or selected — the suggestion is a shortcut into the same free-text field, not a separate locked value.
- What happens with the optional voice-channel link field? → Stored as entered (a plain link, e.g. to Discord), with no verification or auto-connect behavior — any deeper Discord integration is explicitly future work (`docs/adr` / `docs/future-work.md`'s Steam & Discord deferral).
- What happens to the "Recurring" toggle? → Purely descriptive, per the platform's existing decision that recurring sessions aren't backed by a scheduling engine — it tags the listing; it does not generate repeat postings automatically.
- What happens if a verified user's session expires mid-form? → Out of scope for this spec to design a save-and-resume flow; the user re-authenticates and re-enters the form (consistent with no draft state existing).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an authenticated, email-verified user to create a posting by providing at minimum a game name and a listing title.
- **FR-002**: System MUST offer a single-select Genre chip set (FPS, RPG, Co-op PvE, Party, MOBA, Sandbox, TTRPG, Tabletop) and a handful of game-name quick-pick suggestions that fill the Game field when selected.
- **FR-003**: The listing title MUST be capped at 60 characters and the description at 240 characters, each with a visible remaining-character count.
- **FR-004**: System MUST accept optional free-text keywords/tags (comma-separated), capped at a reasonable number of tags (6).
- **FR-005**: System MUST offer a Vibe selection (Casual / Serious, single-select, defaulting to Casual).
- **FR-006**: System MUST offer a Platform selection (PC / Console / Cross-play / Tabletop, single-select).
- **FR-007**: System MUST require a Region selection from the platform's standard region set.
- **FR-008**: System MUST require an Age group selection limited to 18+ / 21+ — no 13+ tier, per ADR 0002 — defaulting to 18+.
- **FR-009**: System MUST offer an optional, multi-select "When do you play?" facet (Mornings, Afternoons, Evenings, Late night, Weekends).
- **FR-010**: System MUST offer an optional specific date and a "Recurring session" toggle; recurring is descriptive only (tags the listing) and does not generate additional postings.
- **FR-011**: System MUST offer Group size (2-8) and Spots open steppers, clamped so spots open is always between 1 and (group size − 1) inclusive, adjusting spots open automatically if a group-size decrease would otherwise put it out of range.
- **FR-012**: System MUST offer an optional "Mic required" toggle (default off) and an optional voice-channel link field.
- **FR-013**: System MUST update a live preview card immediately as any field changes, showing the submitting user's own display name and avatar color as the host.
- **FR-014**: The Publish action MUST remain disabled until both the game and title fields are non-empty, and MUST NOT create a posting if attempted while either is empty.
- **FR-015**: Publishing MUST create a posting with status "open," immediately visible to Home and Browse — no moderation queue or approval delay in this feature's scope.
- **FR-016**: A visitor who is not authenticated MUST be routed to log in before reaching this page.
- **FR-017**: An authenticated user whose email is not verified MUST be blocked from publishing, with a message directing them to verify their email first (Auth & Onboarding's FR-014 gate).

### Key Entities

- **Posting**: The entity this feature creates — extends the shared table already read by Home and Browse with the remaining fields this form collects: keyword tags, the recurring flag, and the optional voice-channel link. Every other field (game, title, blurb/description, vibe, region, genre, age group, time slots, platform, mic-required, group size/spots-open, optional scheduled date) was already established by Home's and Browse's data models.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A verified user can go from landing on `/post` to a live, visible posting in under 2 minutes for a minimally-filled form (just game + title).
- **SC-002**: 100% of published postings are immediately visible on Home and Browse with no delay or extra step.
- **SC-003**: 100% of publish attempts missing a game or title are prevented, never creating a partial or invalid posting.
- **SC-004**: 100% of publish attempts by an unverified user are blocked with a message telling them what to do next (verify email), never a silent failure.
- **SC-005**: 100% of Group size / Spots open adjustments stay within their clamped bounds — spots open is never shown or stored outside 1..(size−1).

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as Home and Browse.
- "Save as draft," shown in the source wireframe, is out of scope for this spec: the Posting data model (established across Home, Browse, and this feature) has no documented draft state, and adding one would mean designing a "My Drafts" surface (most naturally on Profile, not yet spec'd) that nothing in this project has scoped yet. Logged to `docs/future-work.md` as a possible future addition rather than silently building a partial version of it now.
- Game-name quick-pick suggestions are derived the same way Home's Trending row and Browse's Game facet already are — the most common game keywords among currently-open postings — rather than a hand-maintained editorial list, consistent with ADR 0001's rejection of a curated game catalog.
- The optional voice-channel link is stored as plain text with no format verification or Discord integration beyond that; the wireframe's "auto-connect later" footnote describes a future capability, already covered by the platform's existing Steam & Discord deferral (`docs/future-work.md`), not something this feature builds.
- Recurring is descriptive-only, per the platform's existing decision that recurring sessions aren't backed by a scheduling engine — confirmed here, not re-litigated.
- This feature depends on the `postings` table already defined by Home and extended by Browse; this spec's own data model adds the remaining fields (tags, recurring, voiceLink) this form collects, following the same shared-table pattern used throughout.
- This is the first feature to actually call Auth & Onboarding's unverified-email write-action gate (built as a ready-to-call helper in that feature, unconsumed until now) — FR-017 is that gate's first real consumer.
