# Feature Specification: Profile + Account settings

**Feature Branch**: `007-profile-and-account-settings`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Profile + Account settings feature for playm8z: the logged-in user's own profile at `/profile`, four tabs (Overview, My postings, Saved, Account). Source of truth: resources/wireframes/playm8z - Profile.dc.html. Overview: games-I-play list (editable, with optional rank/hours), active-postings preview, public-info sidebar. My postings: all of the user's own postings with status, Edit (only before any application is accepted), Close/Reopen. Saved: bookmarked listings, unsave, empty state. Account: personal info (display name, region, bio -- handle shown read-only, never editable, per the existing handle-immutability rule), password change (Credentials accounts only), privacy toggles, and a single Deactivate action (the wireframe's separate 'Delete permanently' button is dropped -- confirmed by the user: collapse into one Deactivate action rather than offering something labeled 'permanent' that ADR 0005 doesn't actually allow). This is the feature that resolves Listing detail's (006) deferred 'Save' action -- introduces the SavedListing entity Listing detail's heart-toggle will use. Drops several fields/sections the wireframe shows but nothing in this project computes or collects yet: rating, session count, group count, and any leveling/XP display (same reasoning Listing detail already applied to host mini-profiles); pronouns, languages, and timezone (no editor for them exists anywhere, and onboarding never collects them); the Connected Accounts section (Steam/Discord are both already-deferred future state, so this feature doesn't depict a working connection to either). The 'Online' badge on one's own profile is trivially true (you're demonstrably active if you're viewing this page) -- no presence-tracking system needed. Extends the shared `user` table with `bio` and `createdAt` (for 'joined' display), and introduces a new `UserGame` entity (game + optional rank/hours, user-editable) since 'Games I play' needs richer data than onboarding's flat game-name list. The shared top nav/footer are Design System infrastructure, out of scope, same as every prior feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User views and edits their own profile (Priority: P1)

An authenticated user views their profile overview (games they play, a preview of active postings, their own public info), edits their personal information (display name, region, bio) and games list, and changes their password if they have one.

**Why this priority**: The most frequently used part of the feature — every returning user's identity and self-presentation lives here, and it's a prerequisite for the platform feeling like a real account rather than an anonymous session.

**Independent Test**: Edit display name and bio, save, and confirm the change persists and shows on the Overview tab; add a game with a rank and hours, confirm it appears in the games list.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Account tab, **When** they edit display name, region, or bio and save, **Then** the changes persist and are reflected immediately on the Overview tab.
2. **Given** the Account tab, **When** it renders, **Then** the handle is shown as read-only text, never an editable field (handles are immutable once set).
3. **Given** the Overview tab's games list, **When** the user adds a game (with optional rank and hours), **Then** it appears in the list; removing one removes it from the list.
4. **Given** a Credentials-provider account on the Account tab, **When** the user enters their correct current password and a new password (at least 8 characters) and confirms it, **Then** the password is updated.
5. **Given** a Google-only account (no password set) on the Account tab, **When** it renders, **Then** no password-change section is offered.
6. **Given** the user changes their email address, **When** they save, **Then** the account's email-verified status resets and a new verification email is sent to the new address (reusing Auth & Onboarding's verification flow).

---

### User Story 2 - User manages their own postings (Priority: P2)

An authenticated user reviews every posting they've created, sees its status and applicant count, edits one that hasn't accepted anyone yet, and closes or reopens a posting manually.

**Why this priority**: A real, valuable management capability for anyone actively hosting, but secondary to the identity/profile content every user has regardless of whether they've ever posted.

**Independent Test**: As a user with an open posting with no accepted applicants, edit its title and confirm the change; as a user with a posting that has an accepted applicant, confirm Edit is unavailable; close an open posting and confirm its status changes, then reopen it.

**Acceptance Scenarios**:

1. **Given** the My postings tab, **When** it renders, **Then** every posting the user has created appears with its current status and applicant count.
2. **Given** a posting with no accepted applications, **When** the user selects Edit, **Then** they can change its editable fields and save.
3. **Given** a posting with at least one accepted application, **When** the My postings tab renders that posting, **Then** no Edit action is offered (posts can't be edited once an applicant has been accepted).
4. **Given** an open posting, **When** the user selects Close, **Then** its status becomes `closed`; selecting Reopen on a closed posting returns it to `open`.

---

### User Story 3 - User saves and manages bookmarked listings (Priority: P3)

An authenticated user saves listings they're interested in from elsewhere on the platform and reviews or removes them from a dedicated Saved tab.

**Why this priority**: A convenience feature, valuable but not central the way viewing/editing one's own profile (US1) or managing one's own postings (US2) are.

**Independent Test**: With at least one saved listing, view the Saved tab and confirm it appears; unsave it and confirm it's removed and the empty state appears if it was the last one.

**Acceptance Scenarios**:

1. **Given** a user with saved listings, **When** they view the Saved tab, **Then** each appears with enough detail to recognize it and a way to view the full listing.
2. **Given** a saved listing, **When** the user unsaves it, **Then** it no longer appears on the Saved tab.
3. **Given** a user with no saved listings, **When** they view the Saved tab, **Then** an empty state appears with a path to Browse.

---

### User Story 4 - User controls privacy and can deactivate their account (Priority: P4)

An authenticated user toggles what's visible to others on their public profile, and can deactivate their account if they want to step away.

**Why this priority**: Important control/safety functionality, but exercised far less often than the primary identity/postings/saved flows above.

**Independent Test**: Toggle a privacy setting and confirm it persists; deactivate the account and confirm the profile/postings are hidden, then log back in and confirm reactivation.

**Acceptance Scenarios**:

1. **Given** the Account tab's Privacy section, **When** the user toggles any setting (show age group, show region, show online status, discoverable profile), **Then** the new value persists.
2. **Given** the Danger Zone, **When** the user selects "Deactivate account," **Then** their profile and postings are hidden from other visitors, and they're informed reactivation happens automatically the next time they log in.
3. **Given** a deactivated account, **When** that user logs back in, **Then** the account reactivates automatically — no separate "undo" step required.

---

### Edge Cases

- What happens to the wireframe's "Delete permanently" action? → Dropped entirely (confirmed by the user) — offering something labeled "permanent" would be misleading given ADR 0005 already makes true deletion impossible platform-wide. Only "Deactivate account" exists.
- What happens to rating, session count, group count, and any level/XP display on one's own profile? → All omitted — none are computed anywhere in this project yet (same reasoning already applied to Listing detail's host mini-profiles), and Groups itself is platform-wide deferred.
- What happens to pronouns, languages, and timezone shown in the wireframe's read-only sidebar? → Omitted from this feature entirely — no onboarding step or editor collects them anywhere in this project; fabricating display values isn't an option. Logged to `docs/future-work.md`.
- What happens to the Connected Accounts section (Discord, Steam)? → Omitted — both are already-decided future-state (no working integration exists for either), so this feature doesn't depict a fake "Connected" state.
- What happens if a user without a set password (Google-only) somehow reaches the password-change form? → It's never rendered for them in the first place (US1's Acceptance Scenario 5); there's nothing to bypass.
- What happens to a posting's applicant-facing state while its host edits it (before any acceptance)? → Out of scope for this spec to detail further; ordinary field updates, no special transition.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let an authenticated user edit their own display name, region, and bio, persisting changes immediately.
- **FR-002**: The user's handle MUST always be shown as read-only text on this feature's pages — never an editable input (handles are immutable once set).
- **FR-003**: System MUST let a user maintain a list of games they play, each with an optional self-reported rank and hours-played, addable and removable.
- **FR-004**: System MUST let a user with a set password (Credentials accounts) change it, requiring their correct current password and a new password meeting the platform's existing 8-character minimum.
- **FR-005**: System MUST NOT offer a password-change section to an account with no password set (Google-only accounts).
- **FR-006**: Changing the account's email address MUST reset its email-verified status and trigger a new verification email to the new address (reusing Auth & Onboarding's verification mechanism).
- **FR-007**: System MUST show every posting the authenticated user has created, with its current status and applicant count, on a dedicated tab.
- **FR-008**: System MUST let the user edit a posting they host, but only while it has no accepted applications; once any application on that posting is accepted, editing MUST NOT be offered.
- **FR-009**: System MUST let the user manually close an open posting they host, and reopen a closed one.
- **FR-010**: System MUST let a user save a listing (from Listing detail) and view their saved listings on a dedicated tab, each with enough detail to recognize it and a link to the full listing.
- **FR-011**: System MUST let a user unsave a previously-saved listing; when no saved listings remain, an empty state with a path to Browse MUST appear instead of a blank list.
- **FR-012**: System MUST offer privacy toggles (show age group, show region, show online status, discoverable profile) that persist per user; these toggles govern what a future Public Profile feature displays to other visitors — this feature only stores the preference.
- **FR-013**: System MUST offer a single "Deactivate account" action that hides the user's profile and postings from other visitors, with clear copy that logging back in reactivates automatically.
- **FR-014**: System MUST NOT offer a "Delete permanently" or any other action implying true, irreversible data removal, consistent with ADR 0005.
- **FR-015**: This feature's pages MUST require authentication — they show the signed-in user's own account, not a public view (Public Profile, a separate not-yet-spec'd feature, covers viewing someone else's profile).

### Key Entities

- **User**: Extended with `bio` (text) and `createdAt` (timestamp, for "joined" display) — every other field this feature reads/writes (`name`, `handle`, `region`, `ageGroup`, `platforms`, `passwordHash`, `email`, `emailVerified`) already exists from Auth & Onboarding.
- **UserGame**: New entity — one row per game a user reports playing, with an optional self-reported rank and hours-played. Distinct from Auth & Onboarding's flat `gamesPlayed` list (which only captured game names during onboarding); this feature's richer, editable version supersedes that field's display going forward.
- **Posting**: Read and updated (title/details editing, and status transitions between `open`/`closed`) by this feature for postings the authenticated user hosts — no new fields.
- **Application**: Read (count and acceptance status) to determine per-posting applicant counts and whether editing is still allowed.
- **SavedListing**: New entity this feature introduces — a user-to-posting bookmark (`userId`, `postingId`, `createdAt`). This is also the entity Listing detail's previously-deferred "Save" action will use once wired up.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of profile edits (personal info, games list) persist and are reflected immediately without a full page reload.
- **SC-002**: 100% of postings with at least one accepted application never offer an Edit action, regardless of who views the My postings tab.
- **SC-003**: 100% of save/unsave actions are reflected on the Saved tab without requiring a manual refresh path beyond normal navigation.
- **SC-004**: 100% of privacy toggle changes persist across a session.
- **SC-005**: 100% of deactivated accounts are hidden from other visitors until the owner logs back in, at which point reactivation is automatic with no extra step.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- "Deactivate account" is the only account-closure action; "Delete permanently" is dropped entirely rather than offered as a misleading label for the same underlying reversible-disable behavior (confirmed by the user).
- Rating, session count, group count, and any level/XP display are omitted from one's own profile — none are computed anywhere in this project (same reasoning as Listing detail's host mini-profiles), and Groups is platform-wide deferred.
- Pronouns, languages, and timezone are omitted entirely — no onboarding step or editor collects them anywhere in this project. Logged to `docs/future-work.md` as a possible future addition to onboarding/profile editing together, not built partially here.
- The Connected Accounts section (Discord, Steam) is omitted — both are already-decided future state; this feature doesn't depict a working connection to either.
- The "Online" badge on one's own profile is trivially true (viewing this page demonstrates current activity) — no presence-tracking system is needed for this feature. Whether/how "online" displays to *other* visitors is Public Profile's own concern (a separate, not-yet-spec'd feature) — Home already deferred true presence tracking for listing cards, and this feature doesn't reverse that.
- Privacy toggles are stored here but not yet *consumed* anywhere — the feature that actually renders a public-facing profile (Public Profile, not yet spec'd) is what will honor them. This feature's job is only to let a user set and persist their preference.
- "Games I play" entries (game + optional rank/hours) are self-reported by the user, not verified against any external source (no Steam/Discord integration exists) — consistent with those integrations being deferred.
- This feature resolves Listing detail's (`006-listing-detail`) previously-deferred "Save" action by introducing the `SavedListing` entity it needs — a follow-up correction to that feature's own docs, not a new open question.
