# Phase 0 Research: Listing detail

## 1. Why no `RosterSlot` table?

**Decision**: derive the roster per request from the listing's host
plus its `accepted`-status `applications` rows, computing the open
count as `seatsTotal - 1 - acceptedCount`. No separate table.

**Rationale**: `guidelines.md`'s suggested `RosterSlot` shape was
`id, postingId, userId?, role(label), filled` — but ADR 0004 already
established that roster slots carry no role/class label. Once `role`
is gone, `RosterSlot` has nothing left that `applications` (already
tracking `postingId`, `applicantId`, `status`) doesn't already carry.
Maintaining a second table in lockstep with `applications`' status
changes would be pure duplication with a real risk of the two drifting
out of sync.

**Alternatives considered**: keeping `RosterSlot` without a role field,
populated in lockstep with accepted applications — rejected, exactly
the kind of redundant, sync-prone duplication described above.

## 2. Server Actions for apply/withdraw/ask/reply

**Decision**: four Server Actions, following the same pattern Post a
Game established for publishing — no new API routes, no `contracts/`.

**Rationale**: consistent with the project's existing precedent
(`005-post-game`'s research.md #1) for plain authenticated form/button
interactions with no need for a fetch-based contract.

**Alternatives considered**: none new — directly reuses an
already-settled decision.

## 3. Authorization layering: auth, verification, and now ownership

**Decision**: `reply-to-question.ts` adds a third check beyond Auth &
Onboarding's existing pattern (authenticated, email-verified): is this
session's user the listing's `hostId`? A plain inline comparison inside
the Server Action, not a new generalized helper — unlike Error Pages'
`require-role.ts` (a reusable *role* gate for future admin pages),
"is this the resource's own host" is specific to a single posting, not
a broadly reusable role tier.

**Rationale**: Error Pages' `require-role.ts` and Auth & Onboarding's
`require-verified-email.ts` both gate on session-wide properties (role,
verification status); "is the current user this specific resource's
owner" is a per-resource check that doesn't fit either existing helper
without forcing an awkward abstraction for a single call site.

**Alternatives considered**: extending `require-role.ts` to accept a
resource-ownership predicate — rejected as premature generalization for
a single consumer; revisit if a second feature needs the same shape of
check.

## 4. Applying doesn't change `seatsOpen`; only acceptance does

**Decision**: submitting an application (status `pending`) does not
touch the posting's `seatsOpen`/`seatsTotal` — multiple pending
applicants can compete for the same open spot(s). Only an application
transitioning to `accepted` (Inbox/messaging's job, out of this
feature's scope) changes what the roster shows as filled.

**Rationale**: matches how real LFG matchmaking works (a host reviews
several applicants for the same slot) and keeps this feature from
needing to reserve/release capacity around a *pending* state it can't
fully resolve on its own (acceptance itself is out of scope here).

**Alternatives considered**: decrementing `seatsOpen` optimistically on
application submission — rejected, would either let more people apply
than there are real spots (if not decremented) or block further
applicants the moment enough *pending* (not yet accepted) applications
exist, which doesn't match how hosts actually choose among candidates.

## 5. Extending `Application.status` with `withdrawn`

**Decision**: `applications.status` is `pending | accepted | declined |
withdrawn` — a fourth value beyond `guidelines.md`'s originally
suggested three, distinguishing "the applicant withdrew" from "the host
declined."

**Rationale**: ADR 0005 (no hard deletes) means a withdrawn application
must still exist as a row; collapsing it into `declined` would make it
impossible to later tell, from the record alone, whether the applicant
changed their mind or the host said no — a real legibility loss for
something as cheap as one more enum value.

**Alternatives considered**: reusing `declined` for both cases —
rejected for the legibility reason above.

## 6. Save is in scope after all (amended 2026-07-12)

**Decision**: this feature's Save toggle (`toggle-saved-listing.ts`)
inserts/deletes a row in `savedListings`, an entity Profile
(`007-profile-and-account-settings`) defines for its own "Saved" tab.
Unsaving performs a real delete, not a status flag — see data-model.md's
note on why this is a scoped exception to ADR 0005's usual "disable,
don't delete" default.

**Rationale**: originally deferred (this feature's first pass), then
un-deferred once Profile's own spec revealed it already needed the same
entity for its "Saved" tab regardless — building it twice, or excluding
it from the feature that actually surfaces the toggle UI, would be
worse than the small correction recorded here.

**Alternatives considered**: leaving Save deferred and letting Profile
build it alone with no toggle on Listing detail itself — rejected,
since the wireframe clearly shows the heart-toggle living on this page,
not just on Profile's Saved tab.
