# Feature Specification: User-Uploaded Profile Images

**Feature Branch**: `034-profile-images`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "The ability to choose a profile IMAGE (uploaded by the user, not picked from a list) to add to their profile."

## Context

Today every avatar on playm8z is a **coloured gradient block with the
handle's first letter** — `users.avatarColor` picks one of five gradients.
No user has ever had a photo.

Two facts make this feature smaller than it looks, and one makes it larger:

- **A photo column already exists and is already populated for some users.**
  `users.image` is an Auth.js column, and Google sign-in already stores the
  user's Google profile photo in it. Nothing on the site renders it — so
  Google users have a real photo sitting unused. This feature surfaces it.
- **An image-upload path already exists** (News cover images), including the
  fix for a non-obvious platform gotcha, so uploading is a solved problem to
  reuse, not build.
- **There is no shared avatar component.** The gradient-block markup is
  copy-pasted across roughly ten places. "Show a photo instead" is therefore
  not one change but ten — unless a single shared component is introduced
  first. That component is the real backbone of this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a photo for my profile (Priority: P1)

A player opens their account settings, uploads a photo, and sees it become
their avatar everywhere their avatar appears — their profile, their
listings, their forum posts, the inbox.

**Why this priority**: This is the feature. Without it, avatars remain
coloured blocks.

**Independent Test**: Upload an image in account settings, then confirm it
appears as the avatar on the profile header and on at least one other
surface (a listing card or forum reply) — proving the shared component
carries it everywhere, not just where it was set.

**Acceptance Scenarios**:

1. **Given** a signed-in player on their account settings, **When** they
   choose a valid image file, **Then** it uploads, becomes their avatar, and
   is visible without a full-page reload wherever the settings page shows it.
2. **Given** a player who has uploaded a photo, **When** any other user
   views a surface showing that player (a listing, a forum reply, the inbox),
   **Then** the photo is shown, not the gradient block.
3. **Given** a player uploading a file that is not a supported image, or is
   too large, **When** they submit it, **Then** it is rejected with a clear
   message and their existing avatar is unchanged.

---

### User Story 2 - See my Google photo without lifting a finger (Priority: P1)

A player who signed up with Google already has a profile photo (Google's),
stored but never shown. The first time this feature ships, their avatar
becomes that photo automatically — no upload required.

**Why this priority**: It's the difference between "Google users still see a
coloured block despite us holding their photo" (which reads as a bug) and
"every Google user's avatar just works on day one." The data is already
there; not showing it would be the surprising choice.

**Independent Test**: For an account whose stored photo came from Google and
who has uploaded nothing, confirm the avatar renders that Google photo, and
that uploading a photo overrides it.

**Acceptance Scenarios**:

1. **Given** a Google account with a stored Google photo and no uploaded
   image, **When** their avatar renders anywhere, **Then** it shows the
   Google photo, not the gradient block.
2. **Given** that same account, **When** they upload their own photo,
   **Then** the uploaded photo takes precedence over the Google photo.

---

### User Story 3 - Change my mind: replace or remove my photo (Priority: P2)

A player who uploaded a photo can replace it with a different one, or remove
it and fall back to whatever they had before.

**Why this priority**: Uploading without being able to undo is a trap —
someone picks a bad crop or the wrong photo and is stuck with it. Lower than
P1 because the first version delivers value even before remove exists, but
it can't ship without it for long.

**Independent Test**: Upload a photo, replace it, confirm the new one shows;
then remove it and confirm the avatar falls back to the Google photo (if
any) or the gradient block.

**Acceptance Scenarios**:

1. **Given** a player with an uploaded photo, **When** they upload a
   different one, **Then** the new photo replaces the old everywhere.
2. **Given** a player who removes their uploaded photo, **When** their avatar
   renders, **Then** it falls back to the Google photo if one exists, and to
   the gradient block otherwise.
3. **Given** a photo that is replaced or removed, **When** the change
   completes, **Then** the previously-stored uploaded image file is not left
   accruing storage indefinitely.

---

### Edge Cases

- **A Google photo URL later stops resolving** (Google rotates it, the user
  revokes the app). The avatar must degrade to the gradient block rather
  than show a broken image. The gradient block is always a valid final
  fallback; no avatar is ever "broken."
- **A player has an uploaded photo AND a Google photo.** The uploaded one
  wins (precedence), and removing it reveals the Google one — so the two
  values are stored separately, not one overwriting the other.
- **The uploaded file is a valid image but enormous in dimensions** (e.g.
  8000×8000). It's accepted if within the byte limit and displayed within a
  fixed avatar box; no server-side resizing is promised in this version.
- **The stored Google photo is itself the only "image" a user has, and they
  never uploaded anything.** They are not treated as having "uploaded" an
  avatar — removing an upload they never made is a no-op.
- **A moderator viewing the admin user table** sees the same avatars every
  other surface shows, since all surfaces share one component.
- **Concurrent uploads / double-submit.** The last successful upload wins;
  the avatar never lands in a state pointing at a half-written file.

## Requirements *(mandatory)*

### Functional Requirements

**Uploading**

- **FR-001**: A signed-in player MUST be able to upload an image from their
  account settings and have it become their avatar.
- **FR-002**: The system MUST accept common web image formats (JPEG, PNG,
  WebP) and MUST reject other file types with a clear message, reusing the
  existing image-upload constraints rather than inventing new ones.
- **FR-003**: The system MUST reject an image over the existing upload size
  limit with a clear message, and MUST NOT change the current avatar when an
  upload is rejected.
- **FR-004**: Uploading MUST be available to any authenticated user for
  their own account only; a user MUST NOT be able to set another user's
  avatar.

**What an avatar shows (precedence)**

- **FR-005**: An avatar MUST render, in this order of precedence: (1) the
  user's uploaded image if present; (2) otherwise the stored Google photo if
  present; (3) otherwise the existing gradient block with the handle's
  initial.
- **FR-006**: The uploaded image and the stored Google photo MUST be kept as
  distinct values, so that removing an upload reveals the Google photo rather
  than losing it.
- **FR-007**: If an image URL fails to load in the browser, the avatar MUST
  fall back to the gradient block rather than display a broken image.

**One shared component**

- **FR-008**: All avatar render sites across the app MUST show the avatar
  through a single shared component implementing FR-005's precedence, so a
  photo set once appears consistently everywhere and no surface can drift.
- **FR-009**: Avatars MUST be displayed in a consistent square frame with
  the image centre-cropped to fit; the feature MUST NOT include an in-app
  cropping, zooming, or editing UI.

**Replace / remove / lifecycle**

- **FR-010**: A player MUST be able to replace their uploaded image with a
  different one.
- **FR-011**: A player MUST be able to remove their uploaded image, after
  which their avatar follows FR-005's precedence (Google photo, else
  gradient block).
- **FR-012**: When an uploaded image is replaced or removed, the previously
  stored image file MUST NOT be left in storage indefinitely — the prior
  file is discarded. (This concerns stored *files*, not database records,
  and is therefore distinct from the platform's no-hard-delete rule for
  records.)

**Trust boundary & moderation**

- **FR-013**: The uploaded file MUST be validated on the server for type and
  size before being stored — client-side checks are not sufficient.
- **FR-014**: An uploaded avatar is user-generated content shown across the
  site. This version treats it at the same trust level as existing
  user-authored text (bios, handles): no new moderation queue or review
  step. This is a conscious choice, recorded so a later decision to moderate
  avatars is an addition, not a correction.

### Key Entities

- **User avatar** (extends the existing User): gains a stored uploaded-image
  reference, kept separate from the existing Google-photo value and the
  existing gradient-colour value. A user may have none, one, or several of
  these; what renders is decided by precedence (FR-005), not by which exist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can go from "coloured block" to "my photo showing
  everywhere" in under a minute, entirely within account settings.
- **SC-002**: On the day this ships, every Google-signup account with a
  stored Google photo shows that photo as its avatar, with zero action from
  the user.
- **SC-003**: An avatar set once appears identically on 100% of surfaces that
  show that user (profile, listings, forum, inbox, admin) — no surface still
  shows the old gradient block for a user who has a photo.
- **SC-004**: No avatar anywhere renders as a broken image; the worst case is
  always the gradient block.
- **SC-005**: Replacing or removing a photo leaves no growing pile of
  orphaned image files — the count of stored avatar files per user stays at
  most one.

## Assumptions

- **The existing image-upload mechanism and its constraints are adopted
  wholesale** (formats, size limit, storage). This feature does not revisit
  them; it consumes them. The known large-file platform gotcha is already
  fixed app-wide.
- **Account settings is the home for uploading in this version.** Adding an
  avatar upload to the onboarding wizard (which currently collects only the
  gradient colour) is a reasonable future addition but is out of scope here,
  to keep the surface small.
- **`avatarColor` stays exactly as it is** for users who never upload — it
  remains the final fallback, unchanged.
- **No server-side image processing** (resizing, format conversion,
  thumbnail generation) is promised. Images are displayed within a fixed
  avatar frame by the browser. If large-image performance becomes a real
  problem, processing is a follow-on, not part of this.
- **Avatars are trusted like other user-authored content** (FR-014).

## Out of Scope

- Image cropping, zooming, rotating, or any in-app editing UI.
- Multiple photos, galleries, or cover/banner images for a profile.
- Animated avatars (GIF/video).
- Changing how `avatarColor` works for users who don't upload.
- Adding avatar upload to onboarding.
- Any redesign of the profile page beyond placing the avatar and its
  upload/remove controls.
- Server-side resizing, thumbnailing, or a moderation queue for avatars.
