# Phase 0 Research: Profile + Account settings

## 1. Four real routes, not one page with client-side tabs

**Decision**: `/profile` (Overview), `/profile/postings`, `/profile/saved`,
`/profile/account`, sharing a `layout.tsx` for the header and tab
navigation — rather than the wireframe's single page with a `tab`
client-state variable.

**Rationale**: real routes are more idiomatic for the App Router (each
tab gets a shareable/bookmarkable URL, a working browser back button,
and can be server-rendered independently) with no real downside versus
client-only tab state, which the wireframe's static-demo format
defaults to for simplicity, not because it's the better product
behavior.

**Alternatives considered**: one page with client-side tab state
(literally matching the wireframe) — rejected for the reasons above;
this project has consistently preferred real Next.js routing over
client-only view-state where both are equally simple to build
(consistent with Browse's URL-driven filters over Home's in-memory
ones, for a similar underlying reason).

## 2. Password change re-verification

**Decision**: `change-password.ts` re-fetches the user's current
`passwordHash` and compares it against the submitted "current password"
with `bcrypt-ts` before accepting a new one — never trusting that the
form only reached submission because the user typed the right value.

**Rationale**: standard practice for any password-change flow, and
directly required by Principle II's trust-boundary default.

**Alternatives considered**: none — this isn't a real tradeoff.

## 3. Deactivation and reactivation touch `src/auth.ts`

**Decision**: `deactivate-account.ts` sets `user.deactivatedAt` to the
current time. Reactivation clears it automatically the next time that
user successfully signs in — a small addition to `src/auth.ts` (the
second feature to touch it, after Auth & Onboarding's own Google
`profile()` callback), checking `deactivatedAt` and clearing it as
part of establishing the new session.

**Rationale**: spec.md's FR-013/Acceptance Scenario 3 require automatic
reactivation on login with no separate "undo" step — the natural place
to implement that is the same sign-in flow Auth & Onboarding already
built, not a new endpoint the user would have to be told to visit.

**Alternatives considered**: a dedicated "reactivate" page/link emailed
to the user — rejected, more friction than the spec calls for and not
what the wireframe's copy ("reactivate anytime by logging in") implies.

## 4. Reusing Auth & Onboarding's verification-email helper for email changes

**Decision**: `update-email.ts` sets `user.emailVerified` to `null` and
calls Auth & Onboarding's existing `sendVerificationEmail(user, token)`
helper (`001-auth-onboarding`'s `src/lib/email/send-verification-email.ts`)
against the new address, rather than building a second, parallel
verification-email code path.

**Rationale**: it's the exact same problem (send a link, consume a
token, flip `emailVerified`) Auth & Onboarding already solved; this
feature is simply its second caller.

**Alternatives considered**: a separate "confirm email change" flow
with its own token/email template — rejected as needless duplication
of an already-built mechanism.

## 5. Editing a posting reuses Post a Game's validation schema

**Decision**: `manage-posting.ts`'s edit path reuses (imports, doesn't
duplicate) the relevant field schemas from Post a Game's
`src/lib/validations/posting.ts` (`005-post-game`) for whichever fields
this feature allows editing, rather than redefining title/description/
etc. bounds a second time.

**Rationale**: keeps the two features' validation rules from silently
drifting apart over time.

**Alternatives considered**: a fully separate schema for edits —
rejected as duplication with a real risk of drift (e.g., one feature's
60-character title cap changing without the other noticing).
