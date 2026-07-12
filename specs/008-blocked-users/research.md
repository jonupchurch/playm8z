# Phase 0 Research: Blocked Users

## 1. Nesting under Profile's existing `/profile/account` route

**Decision**: `/profile/account/blocked`, a new page nested inside
Profile's (`007-profile-and-account-settings`) existing route tree,
with a one-line link added from `/profile/account`'s own page —
tracked as a task in this feature, not a formal amendment to Profile's
merged docs, since it's purely additive and doesn't change anything
Profile already specified.

**Rationale**: matches the wireframe's own breadcrumb ("Account /
Privacy / Blocked users") and keeps block-management colocated with
the rest of account/privacy settings rather than as a disconnected
top-level route.

**Alternatives considered**: a standalone top-level route (e.g.
`/blocked`) — rejected, doesn't match the documented information
architecture and would orphan the page from where a user would
naturally look for it.

## 2. This project's first modal-dialog UI

**Decision**: both the Block and Unblock modals are real focus-trapped
dialogs (`role="dialog"`, `aria-labelledby`, Escape-to-close, focus
returned to the triggering element on close) — the first time this
project has needed an overlay rather than an inline panel or a
separate page.

**Rationale**: every prior feature's interactive states lived on a
page or in an inline panel (Auth & Onboarding's wizard, Listing
detail's apply panel, Profile's tabs); this is the first wireframe that
specifically calls for a centered overlay dialog, so this is where the
project's dialog accessibility pattern gets established for future
features (e.g., the Report modal Notifications & Report will need) to
follow.

**Alternatives considered**: an inline expand/collapse instead of a
true modal — rejected, doesn't match the wireframe and a confirm-style
interaction (especially Unblock) benefits from the focused, can't-
miss-it framing a real dialog gives it.

## 3. Self-block and duplicate-block rejected server-side, not just hidden

**Decision**: `block-user.ts` explicitly rejects blocking oneself and
re-blocking an already-actively-blocked target, even though the
candidate-search UI already excludes both cases from what a normal
user could ever select.

**Rationale**: Principle II's default — client-side list-filtering is a
UX nicety, not a substitute for a real server-side check, the same
reasoning already applied to Post a Game's stepper-clamping
re-validation.

**Alternatives considered**: relying on the UI's exclusion alone —
rejected for the reason above.

## 4. Minimal `Report` row, no queue/review UI

**Decision**: `block-user.ts` optionally inserts one `reports` row
(`targetType = 'user'`) when "Also report" is checked — a plain
insert, nothing more. No list, filter, or resolution UI for these rows
exists in this feature.

**Rationale**: spec.md's FR-008 requires the checkbox to do something
real (not a decorative no-op), and `guidelines.md` already documents
`Report`'s shape for the not-yet-spec'd Notifications & Report
feature — this feature is simply the first to actually write a row,
leaving every review/queue capability to that future feature.

**Alternatives considered**: a decorative checkbox with no backing
write — rejected as a half-built interaction (this project's own
"no half-finished implementations" default); building real moderator-
facing review tooling now — rejected as significant scope creep well
beyond what this feature's own wireframe depicts.
