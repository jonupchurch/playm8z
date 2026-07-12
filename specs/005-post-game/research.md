# Phase 0 Research: Post a Game

## 1. Server Action or API route for publishing?

**Decision**: a Server Action (`src/lib/actions/create-posting.ts`,
`'use server'`), not a new API route.

**Rationale**: unlike Auth & Onboarding's routes (which had to
interoperate with Auth.js's existing route-handler-based session flow),
publishing a posting is a plain authenticated form submission with no
such constraint — Next.js's own documented pattern for exactly this
case (a form, server-side validation, a database insert) is a Server
Action invoked directly from the form, per `node_modules/next/dist/
docs/`'s data-mutation guidance already confirmed for this project.
No fetch-based contract needs defining, so `contracts/` is skipped.

**Alternatives considered**: a `POST /api/postings` route handler —
rejected as unnecessary indirection; nothing else needs to call posting
creation as a fetch-based endpoint.

## 2. Where do "quick-pick" game suggestions come from?

**Decision**: reuse the same "most common game keyword among
currently-open postings" aggregate that Home's Trending row and
Browse's Game facet already compute, rather than a hand-maintained
editorial list.

**Rationale**: consistent with ADR 0001's rejection of a curated Game
catalog — the wireframe's hardcoded 6-name list was a mockup
convenience, not a product decision to maintain a static list forever.

**Alternatives considered**: a hardcoded list (matches the wireframe
literally) — rejected, reintroduces exactly the kind of curated list
ADR 0001 already ruled out elsewhere.

## 3. Reusing the shared listing-card for the live preview

**Decision**: the live preview renders the same
`src/components/listings/listing-card.tsx` component Home and Browse
use, fed with the form's current (unsaved) field values plus the
submitting user's own display name/avatar color, rather than a second,
near-duplicate preview component.

**Rationale**: the wireframe's preview card and Home/Browse's results
cards are visually identical — same "one shared atom" reasoning Browse
already established when it extended (rather than duplicated) this
component.

**Alternatives considered**: a dedicated `listing-preview.tsx` —
rejected as duplication of an already-shared visual atom for no
behavioral difference.

## 4. Consuming Auth & Onboarding's unverified-email write gate

**Decision**: `create-posting.ts`'s Server Action calls Auth & Onboarding's
`src/lib/auth/require-verified-email.ts` helper (planned in that
feature's `001-auth-onboarding/plan.md`, built as a ready-to-call
function with no consumer until now) before performing the insert. If
the gate rejects (no session, or session not yet email-verified), the
action returns the FR-017 message and creates nothing.

**Rationale**: this is exactly the write action Auth & Onboarding's
FR-014 was written to gate — Post a Game is simply the first feature
whose own plan actually wires it in, closing the loop that feature
deliberately left open.

**Alternatives considered**: re-implementing an equivalent check inline
— rejected, defeats the entire point of Auth & Onboarding having built
a reusable, shared gate in the first place.

## 5. Re-validating the Group size / Spots open relationship server-side

**Decision**: the Zod schema for posting creation includes a `refine`
(or equivalent cross-field check) re-deriving that `spotsOpen` is
between `1` and `groupSize - 1` inclusive, independent of whatever the
client's stepper UI already clamped to.

**Rationale**: Principle II's default is that nothing crossing a trust
boundary is assumed pre-shaped — the client-side clamping (FR-011) is a
UX nicety, not the actual guarantee; a hand-crafted request bypassing
the UI must still be rejected if it violates the same bounds.

**Alternatives considered**: trusting the client's clamped values as
already valid — rejected, exactly the kind of assumption Principle II
exists to prevent.
