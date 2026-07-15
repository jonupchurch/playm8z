# Feature Specification: Admin Users Drawer — View Full Profile in a New Tab

**Feature Branch**: `027-admin-user-profile-link`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Admin Users drawer: view full profile in a new tab. Add a link/button in the existing per-user drawer (Admin Users, feature 016) that opens the same user's real public profile page in a new browser tab, using the handle already available on that user. Lets a moderator cross-reference the full public-facing profile without losing their place in the admin queue. Not the master-detail layout redesign (declined), not bulk management -- purely one link, one user at a time, including banned/flagged users. No change to the Public Profile page itself."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cross-reference a user's public profile while moderating (Priority: P1)

A moderator reviewing a user in the Admin Users drawer (join date, region, open reports, ban status, postings/forum activity) wants to see how that person actually presents to the rest of the platform -- their bio, avatar, games, open postings, and reviews -- without abandoning the admin queue they're working through.

**Why this priority**: This is the entire feature. Without it there is nothing else to build.

**Independent Test**: Open the Admin Users drawer for any user, use the new control, and confirm the same user's public profile renders in a separate tab while the admin drawer and its underlying queue/filters remain exactly as they were in the original tab.

**Acceptance Scenarios**:

1. **Given** a moderator has the drawer open for an active user, **When** they use the "view full profile" control, **Then** that user's public profile page opens in a new tab, and the original tab still shows the drawer open on the same user with the admin queue's filters/position unchanged.
2. **Given** the drawer is open for a flagged or banned user, **When** the moderator uses the control, **Then** the same public profile page opens for that user in a new tab -- the control is not hidden or disabled based on account status.
3. **Given** the public profile opens in a new tab, **When** the moderator inspects it, **Then** it is the identical page any ordinary visitor would see for that handle -- no admin-only content or admin-specific view is injected.
4. **Given** the moderator closes the new tab, **When** they return to the original tab, **Then** the admin drawer and queue are untouched, exactly as left.

### Edge Cases

- A banned user's public profile may itself display differently to ordinary visitors (e.g. deactivated-account handling) -- that presentation is entirely owned by the existing Public Profile feature and is unaffected by this one.
- If the moderator's browser blocks the new tab (e.g. a popup blocker), that is a browser-level behavior outside this feature's control; the control's job is only to request a new tab, not to guarantee one opens.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Admin Users drawer MUST present a control that opens the currently-viewed user's public profile page.
- **FR-002**: The control MUST open the profile in a new browser tab (or window), leaving the admin drawer and the underlying admin queue's state (filters, search, scroll position, selection) unchanged in the original tab.
- **FR-003**: The control MUST be available for every user shown in the drawer regardless of account status (active, flagged, or banned).
- **FR-004**: The destination page MUST be the same public profile page and content that any other visitor would see for that user -- this feature introduces no admin-specific variant of the profile.
- **FR-005**: The control MUST target the correct user -- if the drawer is switched to a different user, the control must point at that new user's profile, never a stale one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A moderator can reach any drawer-visible user's full public profile in a single interaction, with zero loss of their current position in the admin queue.
- **SC-002**: The control is present and functional for 100% of users shown in the drawer, including banned and flagged accounts.
- **SC-003**: The profile a moderator sees via this control is pixel-for-pixel the same page a logged-out visitor sees for that same user -- no divergent admin view exists to maintain.

## Assumptions

- The destination is the existing, already-shipped Public Profile page (feature 022); this feature creates no new page, route, or profile content.
- The handle used to build the link is the account's existing, immutable handle -- already fetched as part of the drawer's current data, requiring no new lookup.
- "New tab" is implemented via standard browser new-tab/new-window behavior; popup-blocker interference is a known, accepted browser-level limitation outside this feature's scope.
- No bulk/multi-user interaction is introduced -- the drawer's existing one-user-at-a-time model is unchanged, and the master-detail layout wireframe is explicitly not part of this feature.
