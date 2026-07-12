# Feature Specification: Auth & Onboarding

**Feature Branch**: `001-auth-onboarding`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Auth & Onboarding feature for playm8z: sign-in/sign-up UI on top of already-built Auth.js v5 machinery (Google OAuth + native Credentials email/password), plus a post-signup onboarding wizard. Source of truth: resources/wireframes/playm8z - Auth & Onboarding.dc.html and resources/guidelines.md section 7.12."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New user signs up and completes onboarding (Priority: P1)

A first-time visitor creates an account (email + password, or Google) and is guided through a short setup wizard — display name, the games they play, where/how they play, and their vibe — before landing on a personalized home feed.

**Why this priority**: Without this, there are no users on the platform at all. Every other feature (posting, applying, messaging, forum) assumes an account exists with at least a display name.

**Independent Test**: Can be fully tested by creating a brand-new account end to end and confirming the resulting profile reflects everything entered during setup, without touching any other feature.

**Acceptance Scenarios**:

1. **Given** a visitor with no account, **When** they submit a unique handle, a valid email, and a password of at least 8 characters, **Then** an account is created and they enter the onboarding wizard at step 1.
2. **Given** a visitor with no account, **When** they choose to continue with Google instead, **Then** an account is created from their Google profile and they enter the onboarding wizard at step 1 (no password/handle prompt).
3. **Given** a user on any onboarding step, **When** they complete all four steps, **Then** they see a completion screen summarizing their choices and can proceed to Home.
4. **Given** a user submitting the sign-up form, **When** the chosen handle is already taken, or doesn't start with a letter, or contains characters other than letters/numbers, or exceeds 24 characters, **Then** the submission is rejected with a specific, actionable error and no account is created.

---

### User Story 2 - Returning user logs in (Priority: P2)

An existing user logs back in (email + password, or Google) and lands directly on their home feed — no onboarding repeats.

**Why this priority**: Retention depends on returning users being able to get back in quickly; this is the second most-exercised path after initial signup.

**Independent Test**: Can be fully tested by logging in with a previously-created account and confirming the user lands on Home immediately, with no onboarding steps shown.

**Acceptance Scenarios**:

1. **Given** a user with an existing email/password account, **When** they submit the correct credentials, **Then** they are signed in and taken directly to Home.
2. **Given** a user with an existing account, **When** they submit an incorrect password, **Then** they see a generic invalid-credentials error that does not reveal whether the email itself is registered.
3. **Given** a returning user who signs in with Google, **When** their Google account matches an existing linked account, **Then** they are signed in directly to Home without repeating onboarding.

---

### User Story 3 - New user skips onboarding (Priority: P3)

A newly-signed-up user chooses "Skip for now" partway through the wizard and still ends up with a working, usable account.

**Why this priority**: Onboarding friction is a common drop-off point; letting users defer it (rather than forcing completion) protects signup completion rate, at the cost of a less-personalized initial feed.

**Independent Test**: Can be fully tested by signing up, skipping at any step, and confirming the account is fully functional (can reach Home, log out and back in) despite incomplete profile data.

**Acceptance Scenarios**:

1. **Given** a user on any onboarding step, **When** they choose "Skip for now," **Then** their account is preserved as-is (only the fields already entered are saved) and they proceed to the completion screen.
2. **Given** a user who skipped onboarding, **When** they log back in later, **Then** onboarding does not resume or re-prompt automatically — completing the remaining profile fields (if ever) is a Profile-feature concern, not part of this flow.

---

### Edge Cases

- What happens when someone submits the sign-up form with an email that's already registered? → Rejected with a specific error; no new account created, no hint about whether the account uses Google or Credentials.
- What happens when a Google sign-in's email matches an existing Credentials-registered email? → Out of scope for this spec to fully resolve the merge behavior; treat as a distinct account unless a later feature explicitly links them (see Assumptions).
- What happens if a user abandons onboarding mid-step by closing the tab (not clicking Skip)? → Same as skip: the account exists with only whatever was saved up to that point; nothing is lost, nothing blocks a later login.
- How does the system handle an unverified Credentials-signup user trying to post a listing or send a message? → Blocked with a message pointing them to verify their email first (see FR-014).
- What happens when the "Forgot password?" link is used? → Out of scope for this feature; password reset is tracked as its own not-yet-designed feature (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a new user to create an account with a unique handle, an email address, and a password of at least 8 characters.
- **FR-002**: System MUST allow a new or returning user to authenticate via Google instead of a handle/email/password.
- **FR-003**: System MUST enforce handle rules at account creation: unique across all users, letters and numbers only, must start with a letter, maximum 24 characters. Handles cannot be changed once set (a future capability to change it later is explicitly out of scope here).
- **FR-004**: System MUST reject sign-up attempts with a malformed email, a password under 8 characters, or a handle that fails FR-003's rules, with a specific error identifying which field failed.
- **FR-005**: System MUST authenticate a returning user's email + password against the stored credentials without revealing, on failure, whether the email itself is registered.
- **FR-006**: System MUST route every newly-created account (regardless of sign-up method) through the onboarding wizard before reaching Home for the first time.
- **FR-007**: System MUST route every returning user (existing account, any sign-in method) directly to Home, never back through onboarding.
- **FR-008**: Onboarding step 1 (Profile) MUST require a non-empty display name and MUST let the user pick an avatar color from a fixed palette.
- **FR-009**: Onboarding step 2 (Games) MUST require at least one selection from a list spanning both video games and tabletop/TTRPG titles.
- **FR-010**: Onboarding step 3 (Where & how) MUST require a region and an age-group selection, and MUST offer platforms as an optional multi-select. The age-group options offered MUST be 18+ and 21+ only — no 13+ tier — per the platform's 18+ minimum-age policy; 21+ is a stricter self-tag, not a separate minimum.
- **FR-011**: Onboarding step 4 (Vibe) MUST require a casual/serious/both selection and MUST offer preferred play-time windows as an optional multi-select.
- **FR-012**: System MUST let the user skip onboarding at any step ("Skip for now"), preserving whatever fields were already entered and proceeding straight to the completion screen without requiring the remaining steps.
- **FR-013**: System MUST send a verification email to a Credentials-signup user's address after account creation, and MUST track whether that address has been verified. Google-authenticated accounts are considered verified automatically, since Google has already verified the address.
- **FR-014**: System MUST allow an unverified user to browse and read public content, but MUST block them from posting, applying to a listing, or sending a message until their email is verified, with a clear message directing them to verify.
- **FR-015**: System MUST present a "Forgot password?" entry point on the login form; the reset flow it leads to is a separate feature and is not implemented as part of this one.
- **FR-016**: System MUST NOT offer Steam or Discord as sign-in options — both are explicitly future-state, not part of this feature.

### Key Entities

- **User**: A player account. Attributes touched by this feature: unique handle (immutable), email, password hash (Credentials accounts only), display name, avatar color, email-verified status, region, platforms, age group (18|21), vibe (casual/serious/both), preferred play-time windows, games played (a free-text/keyword list, consistent with how games are represented elsewhere on the platform — not a reference to a curated catalog).
- **Email verification token**: A short-lived token tying a pending verification to a specific user/email, consumed once when the user confirms via the emailed link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from landing on the sign-up form to a completed onboarding wizard in under 2 minutes.
- **SC-002**: A new user who chooses to skip onboarding can go from landing on the sign-up form to a usable account on Home in under 30 seconds.
- **SC-003**: A returning user can go from the login form to Home in under 15 seconds, excluding the time spent typing credentials.
- **SC-004**: At least 90% of sign-up attempts with valid input succeed without the user needing to retry due to unclear validation errors.
- **SC-005**: 100% of write actions (posting, applying, messaging) attempted by an unverified user are blocked with a message that tells them what to do next.

## Assumptions

- Password reset (the flow behind "Forgot password?") is a separate, not-yet-designed feature and is explicitly out of scope here — this feature only needs to present the entry point.
- Steam and Discord sign-in are explicitly out of scope (future state), even though the source wireframe shows both as buttons.
- The wireframe's "Replay the flow" button on the completion screen and any preview/state-switcher controls are design-review aids, not product scope, and are excluded.
- If a Google sign-in's email matches an existing Credentials-registered email, this feature treats them as separate accounts rather than resolving the merge — account linking across auth methods is not addressed here.
- The email-verification email itself (which transactional email provider sends it, exact email copy/branding) is an implementation detail for the planning phase, not fixed by this spec — only the requirement that verification happens and gates write actions (FR-013, FR-014) is in scope here.
- A skipped or partially-completed onboarding profile is never auto-resumed or re-prompted by this feature; surfacing "complete your profile" reminders elsewhere (e.g., on the Profile page) is a different feature's concern.
- Terms/Community Guidelines agreement on sign-up is handled as an informational notice (matching the wireframe's footnote text), not a separate checkbox requiring explicit interaction.
