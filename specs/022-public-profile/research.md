# Phase 0 Research: Public Profile

## 1. Reconciling six wireframe elements against already-established decisions

**Decision**: drop the online-presence dot, "reliability %," "groups"
count, per-game rank/hours, "level," and pronouns/languages/timezone
entirely — no substitutes invented.

**Rationale**: each has direct, already-established precedent: real
presence tracking has been declined on five separate prior features;
`reliabilityPct` was already deferred in an earlier gap-analysis
pass; Groups/Clans has been deferred platform-wide since this
project's original scoping; no per-game rank/hours or leveling system
exists anywhere to back those fields with real data; pronouns/
languages/timezone were already logged as deferred future-work and
weren't part of this feature's own 2026-07-12 scope confirmation
(only Follow/Invite/mutual-connections were).

**Alternatives considered**: computing a substitute for any of these
(e.g., "level" from account age, "reliability" from some proxy) —
rejected, would be inventing new speculative systems this feature was
never asked to build, the opposite of reconciling against what's
already decided.

## 2. "Sessions" — a real, computed proxy stat

**Decision**: `sessions` = COUNT(this user's own `applications` where
`applicantId = user` AND `status = 'accepted'`) + COUNT(this user's
own hosted `postings` where `status IN ('full', 'closed')`).

**Rationale**: unlike the dropped stats (#1), this one IS fully
answerable from existing tables — a reasonable "how many parties has
this person actually been part of" proxy, without needing the
deferred rating/session-completion infrastructure the wireframe's
"reviews" section separately depends on.

**Alternatives considered**: leaving "sessions" out entirely, given
it's adjacent to the deferred rating system — rejected; unlike
reviews (which genuinely requires a rating-submission event that
doesn't exist), this count needs nothing new, so dropping it would be
under-using data this project already has.

## 3. "Invite to a party" reuses `applications` via a new `initiatedBy` discriminator

**Decision**: `applications` gains `initiatedBy` (`applicant` \|
`host`, default `applicant`). `invite-to-party.ts` inserts a row with
`initiatedBy = 'host'`, `applicantId` = the invited user,
`postingId` = the inviting host's chosen open posting, `status =
'pending'` — otherwise identical to a normal application. `011`'s
`accept-request.ts`/`decline-request.ts` are amended so the
authorized actor is the invited applicant (not the host) when
`initiatedBy = 'host'`; `011`'s `get-inbox-list.ts` is amended to
also surface a pending host-initiated row in the invited applicant's
own inbox (previously it only ever surfaced pending applications to
the hosting user).

**Rationale**: an invite still needs the invited person's consent —
forcing them onto a roster without a chance to decline would be a
worse product decision than the existing applicant-initiated flow's
own host-approval step, and reusing the exact same
Application/seat-decrement/conversation-creation transaction (`011`'s
`accept-request.ts`) guarantees identical behavior regardless of who
initiated it, rather than a second, parallel "invite acceptance"
implementation that could silently diverge (e.g., forgetting the
transactional seat-decrement).

**Alternatives considered**: an entirely separate `Invite` table and
accept/decline flow — rejected, would duplicate `011`'s already-
correct transactional logic for no benefit; auto-accepting an invite
(skip consent entirely, since the host already wants this person) —
rejected, removes the invited user's ability to decline, a real UX
regression versus the existing flow's own consent step.

## 4. `follows` — a new, simple, hard-deletable relation

**Decision**: `follows` (`followerId`, `followeeId`, `createdAt`).
Unfollowing deletes the row; re-following creates a new one.

**Rationale**: the same "no trust/safety history value" exception
already applied to `SavedListing`/`Likes`/`ThreadSubscription` — a
follow relationship carries no moderation/trust significance the way
a `Block` does (which IS soft-preserved, per `008`), so a real delete
on unfollow is the right, already-precedented choice rather than
inventing a soft `unfollowedAt` state nothing here needs.

**Alternatives considered**: soft-preserving unfollow history
(mirroring `Blocks`) — rejected, no feature or safety concern in this
project reads "who used to follow whom," unlike blocking's real
trust/safety value.

## 5. Mutual connections and shared games — computed, not stored

**Decision**: `get-in-common.ts` computes, at read time: mutual
follows = accounts that both the viewer and the profile owner follow
(intersection of two `follows` queries); shared games = intersection
of the viewer's and profile owner's `user.gamesPlayed` arrays. Shown
only to an authenticated viewer who isn't viewing their own profile.

**Rationale**: both are naturally derivable from existing data at
read time — the same "computed, never stored" preference applied
throughout this project (Admin Users' Flagged, the moderation
cluster's severity, `020`'s scheduled-post visibility).

**Alternatives considered**: a maintained/cached "mutual friends"
count updated on every follow/unfollow — rejected, unnecessary
mutable state duplicating a cheap-enough read-time computation for
this scale (a user's own follow list and game list are both small).

## 6. `Review` ships with no writer, matching precedent

**Decision**: new `reviews` table (`revieweeId`, `reviewerId`,
`rating`, `text`, `game`, `createdAt`), this feature's first and only
consumer being its own display (rating average, review count, review
list) — no Server Action writes to it yet.

**Rationale**: identical to `Notification`/`AuditEntry`'s own
"ship the entity and its display, adopt the write mechanism later"
pattern — post-session rating submission remains deferred platform-
wide (`docs/future-work.md`), but the profile page still needs
somewhere real (even if currently empty) to read from, rather than a
placeholder that would need reworking once ratings do ship.

**Alternatives considered**: omitting the Reviews section entirely
until ratings exist — rejected; the wireframe's own guidance and this
feature's confirmed scope explicitly keep it as a display-only
section now, and an empty state ("No reviews yet") is a perfectly
normal, honest UI for a feature whose writer hasn't shipped yet.
