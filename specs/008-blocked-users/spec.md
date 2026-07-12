# Feature Specification: Blocked Users

**Feature Branch**: `008-blocked-users`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Blocked Users feature for playm8z: the user-facing block-management page at `/profile/account/blocked` (reached from Account / Privacy). Source of truth: resources/wireframes/support/playm8z - Blocked Users.dc.html and resources/guidelines.md section 12.4. Page: 'what blocking does' info callout, live count, search, list of blocked users (avatar, name, handle, blocked date) each with Unblock; two empty states (no blocks at all, search no match). A reusable Block modal (two steps: pick a candidate by search, then confirm) and a separate Unblock confirm modal. Blocking gates messaging, applications, and content visibility in both directions, per the platform's existing decision (see the no-hard-deletes/blocking memory) -- this feature defines the Block relationship and its query surface; enforcing it in Home/Browse/Listing detail/future Inbox/Forum is each of those features' own responsibility. The wireframe's blocked-row 'reason' chip (hardcoded sample values like 'Harassment'/'Spam' in the demo data) doesn't correspond to any real input anywhere in the flow -- the only thing that actually sets it is the block modal's 'Also report to moderators' checkbox, so this feature keeps that checkbox and drops the fake reason taxonomy: a block is either plain or was reported, nothing more specific. Since guidelines.md already documents a full `Report` entity (reporterId, targetType, targetId, reason, status) for a separate not-yet-spec'd Notifications & Report feature, this feature becomes that entity's first writer -- checking 'Also report' inserts a minimal Report row (targetType='user'); this feature does not build any moderation review/queue UI for it, that's Notifications & Report's job. The Block modal is built reusable (accepting a pre-selected target) since guidelines.md documents it as invokable from any profile or message thread, not just this page. Blocking and unblocking are write actions gated on email verification, consistent with every other write action so far (Auth & Onboarding's FR-014), even though blocking wasn't one of that gate's originally-named actions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User views, searches, and unblocks from their blocked list (Priority: P1)

An authenticated user opens their blocked-users page, sees who they've blocked and when, searches to find a specific one, and unblocks someone they no longer want blocked.

**Why this priority**: The actual management surface — without it, blocking would be a one-way action with no way to review or undo it.

**Independent Test**: With at least one blocked user, view the list, search for them by name, and unblock them via the confirm step; confirm they no longer appear.

**Acceptance Scenarios**:

1. **Given** an authenticated user with blocked users, **When** they view this page, **Then** each appears with avatar, name, handle, and the date blocked, plus a live count.
2. **Given** the blocked list, **When** the user searches by name or handle, **Then** the list narrows to matches; a search matching nothing shows a "no results for this search" message distinct from having no blocks at all.
3. **Given** a blocked user's row, **When** the user selects Unblock and confirms, **Then** that block is lifted and the row no longer appears.
4. **Given** a user with no blocks at all, **When** they view this page, **Then** an empty state appears with a path to block someone, distinct from the no-search-match empty state.

---

### User Story 2 - User blocks someone new (Priority: P2)

An authenticated user opens the Block modal, searches for and picks a player, confirms the block (optionally also reporting them), and the block takes effect immediately.

**Why this priority**: The entry point into blocking at all, but secondary to actually managing an existing list (US1) in terms of how often it's exercised — most sessions on this page are reviewing/unblocking, not initiating a new block.

**Independent Test**: Open the Block modal, search for and pick a candidate, confirm the block, and confirm they now appear on the blocked list; repeat with "Also report" checked and confirm the row reflects that.

**Acceptance Scenarios**:

1. **Given** the Block modal's pick step, **When** the user searches, **Then** results exclude themselves and anyone already blocked.
2. **Given** a picked candidate, **When** the user confirms the block, **Then** a new Block record is created effective immediately, and the blocked user is never notified.
3. **Given** the confirm step, **When** the user also checks "Also report to moderators" before confirming, **Then** a minimal Report record is created alongside the block (targetType `user`), and the blocked-list row reflects that this block included a report.
4. **Given** any authenticated user, **When** they attempt to block themselves (should the UI ever allow reaching that state), **Then** the system rejects it.

---

### Edge Cases

- What happens to the wireframe's per-block "reason" chip (Harassment, Spam, etc.)? → Dropped — nothing in this feature (or anywhere else) actually collects a reason taxonomy; a block's row reflects only whether it included a report, not a specific category.
- What happens when a user tries to block someone they've already blocked? → The candidate list already excludes anyone already blocked (Acceptance Scenario 1), so this shouldn't be reachable through normal use; if attempted directly, the system does not create a duplicate block.
- What happens with the "Also report to moderators" checkbox's downstream moderation review? → Out of scope here — this feature only writes the `Report` row; reviewing/actioning it is the not-yet-spec'd Notifications & Report feature's job.
- What happens to actually enforcing a block (hiding content, blocking messages/applications) elsewhere on the platform? → Out of this feature's scope beyond defining the relationship and its query surface — each feature that shows user-generated content or lets users interact (Home, Browse, Listing detail, and the not-yet-spec'd Inbox/Forum) is responsible for consulting it.
- What happens if an unverified user tries to block or unblock someone? → Blocked with a message directing them to verify their email first, consistent with every other write action (Auth & Onboarding's FR-014), even though blocking wasn't in that gate's originally-named list.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show an authenticated user their own blocked-users list (avatar, name, handle, date blocked), with a live count.
- **FR-002**: System MUST let the user search/filter their own blocked list by name or handle.
- **FR-003**: System MUST show a "no blocks at all" empty state with a path to block someone, and a distinct "no results for this search" state when a search matches nothing.
- **FR-004**: System MUST let the user unblock a blocked user via a confirm step (Cancel / Unblock), restoring normal access between the two users.
- **FR-005**: System MUST offer a reusable Block flow — search/pick a candidate (excluding the user themselves and anyone already blocked), then confirm — invokable both from this page and, in the future, directly with a pre-selected target from elsewhere (e.g., a profile or message thread).
- **FR-006**: Blocking MUST create a Block record effective immediately; the blocked user is never notified that they've been blocked.
- **FR-007**: Only the user who initiated a block MUST be able to unblock it.
- **FR-008**: The confirm step MUST offer an "Also report to moderators" option; checking it MUST create a minimal Report record (`targetType = user`) alongside the block — this feature does not build any review/queue UI for that record.
- **FR-009**: A blocked-list row MUST indicate whether that block included a report, with no more specific reason category (the wireframe's per-block reason taxonomy is dropped — see Edge Cases).
- **FR-010**: Both blocking and unblocking MUST require authentication and email verification, consistent with every other write action.
- **FR-011**: This feature MUST define the Block relationship as a queryable entity that other features consult to enforce mutual invisibility (content, messaging, applications) — this feature does not itself implement that enforcement in Home, Browse, Listing detail, or any other feature's own surface.

### Key Entities

- **Block**: New entity this feature introduces — `blockerId`, `blockedId`, `createdAt`, and an `unblockedAt` (nullable) marking when it was lifted (not hard-deleted, ADR 0005 — a block has real trust/safety relevance worth preserving as history, unlike the `SavedListing`/`UserGame` exceptions Profile made). Active (not-yet-unblocked) rows are what every other feature's enforcement logic should consult.
- **Report**: New entity this feature introduces (as its first writer) — `reporterId`, `targetType` (`user` \| `posting` \| `forum` \| `message`, per `guidelines.md`'s documented shape), `targetId`, an optional `reason`, `status` (`open` default), `createdAt`. This feature only ever writes `targetType = user` rows via the "Also report" checkbox; the not-yet-spec'd Notifications & Report feature owns every other write path and all review/moderation UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of a user's active blocks are shown with accurate identity and date information, and are searchable.
- **SC-002**: 100% of unblock confirmations restore access without requiring the user to navigate elsewhere.
- **SC-003**: 100% of new blocks take effect immediately with no notification ever sent to the blocked user.
- **SC-004**: 100% of blocks made with "Also report" checked produce exactly one `Report` row, never zero or more than one.
- **SC-005**: 100% of block/unblock attempts by an unverified user are blocked with a message telling them what to do next.

## Assumptions

- The wireframe's per-block "reason" chip (Harassment, Spam, etc.) was hardcoded demo sample data, not a real input path anywhere in the interactive flow — the only real signal is whether "Also report" was checked, so that's all this feature tracks.
- Extending Auth & Onboarding's unverified-email write gate to cover blocking/unblocking (not one of that gate's originally-named actions: posting, applying, messaging) is a reasonable, low-risk consistency extension, not a new open question — every meaningful write action in this project has followed the same gate so far.
- Enforcing a block's effects elsewhere (hiding a blocked user's postings on Home/Browse, blocking their applications/questions on Listing detail, blocking messages once Inbox exists) is out of this feature's own scope — it defines the relationship; each of those features is responsible for consulting it, and existing merged features' docs may need a small follow-up amendment to reflect that (tracked separately, same pattern already used for the `SavedListing` correction to Listing detail).
- This feature is the first writer of the `Report` entity `guidelines.md` already documents, but builds no moderation review/queue UI for it — that belongs entirely to the not-yet-spec'd Notifications & Report feature. Listing detail's own previously-deferred "Report" action (`006-listing-detail`) is not retroactively un-deferred by this feature — that remains a separate, not-yet-made decision, noted in `docs/future-work.md`.
- The Block modal is built as a reusable component (accepting an optional pre-selected target) even though no other feature invokes it directly yet, since `guidelines.md` explicitly documents it as cross-cutting — consistent with how `listing-card.tsx` was built reusable ahead of Browse actually needing the extended version.
