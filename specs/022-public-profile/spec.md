# Feature Specification: Public Profile

**Feature Branch**: `022-public-profile`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Public profile page for playm8z at `/u/:handle`. Source of truth: resources/wireframes/playm8z - Public Profile.dc.html and resources/guidelines.md. Header (avatar, handle, join date, bio, action buttons: Invite to a party / Message / Follow / '...' menu with Share profile, Report user, Block user), stats row, games the user plays, their open parties, player reviews (display only), a public-info sidebar (region/age group/platforms), and a 'You have in common' mutual-connections + shared-games sidebar. Gated to public view (no auth needed to see a profile); Follow/Invite/Message/Report/Block require an authenticated, email-verified session, consistent with every other write action.

Scope confirmed 2026-07-12 (docs/feature-list.md): a Follow toggle (new social-graph relation, distinct from blocking), a host-initiated 'Invite to a party' action (distinct from Listing detail's, 006, existing applicant-initiated 'Apply for a slot'), and a 'You have in common' mutual-connections sidebar are all IN SCOPE, not deferred. 'Player reviews' is shown DISPLAY ONLY -- the rating submission flow itself remains deferred platform-wide (docs/future-work.md); this feature introduces the read-side `Review` entity with no writer yet, the same 'ship the entity/display, adopt the writer later' pattern already used for Notification/AuditEntry.

Reconciliations against already-established decisions:
- The wireframe's green 'Online' presence dot is dropped entirely -- this project has repeatedly and explicitly declined to build real presence/online tracking (Home, Profile/Account settings, Forum Index, Inbox, Admin Dashboard all separately made this same call); no substitute indicator is added here either.
- The wireframe's '96% reliable' stat is dropped -- `reliabilityPct` was already explicitly deferred in an earlier gap-analysis pass, not something this feature reopens.
- The wireframe's '17 groups' stat is dropped -- Groups/Clans is deferred platform-wide from this project's very first scoping decision, not something this feature reopens; the nav bar's 'Groups' link (Design System infrastructure, out of this feature's own scope) is likewise not real here.
- The wireframe's per-game 'rank'/'hours played' flourishes are dropped -- no per-game rank/playtime tracking exists anywhere in this project (`user.gamesPlayed` from Auth & Onboarding, 001, is a plain free-text array of game names, not a structured per-game record); the Games section shows just the games list.
- The wireframe's 'level 24' is dropped -- no leveling/XP system exists anywhere in this project; inventing one here would be new, unrequested scope.
- The wireframe's Pronouns/Languages/Timezone sidebar fields are dropped -- these were explicitly logged as a deferred future-work item in an earlier session and are NOT part of this feature's 2026-07-12 scope confirmation (only Follow/Invite/mutual-connections were confirmed); this feature doesn't silently reopen that deferral. The sidebar shows Region/Age group/Platforms only (all real fields from `001`).
- 'Sessions' (a real, computed stat, unlike the three dropped above) = the count of this user's own accepted Applications (as applicant, `006`) plus their own hosted postings that have reached `full`/`closed` (`003`) -- a proxy for 'parties this person has actually been part of,' fully computed from existing tables, no new tracking.
- 'Invite to a party' (host-initiated) reuses Listing detail's (006) `applications` table rather than inventing a parallel invite system: adds a new `initiatedBy` ('applicant' | 'host') column, defaulting to 'applicant' for every existing/future normal application. A host-initiated row still starts `pending` and still needs the OTHER party's decision -- but that other party is now the invited applicant, not the host, mirroring the existing flow's consent requirement rather than skipping it (an invite doesn't force someone onto a roster). This requires small, bounded amendments to Inbox's (011) `accept-request.ts`/`decline-request.ts` (the authorized actor becomes the invited applicant, not the host, when `initiatedBy = 'host'`) and its `get-inbox-list.ts` (also surfaces a host-initiated pending invite in the INVITED USER's own inbox, not just host-facing pending applications). No change to Notifications + Report modal (012) is needed -- it never wired any real caller to `createNotification()` yet, so this feature's own `invite-to-party.ts` is simply among the first real callers, targeting the invited user directly.
- Follow is a new, simple, asymmetric relation (`follows`: `followerId`, `followeeId`, `createdAt`) -- unfollowing is a real row delete (re-following creates a new row), the same 'no trust/safety history value' exception already applied to `SavedListing`/`Likes`/`ThreadSubscription`, not `Blocks`' soft-preserved pattern (a block carries real trust/safety value; a follow doesn't).
- 'You have in common' mutual connections = the intersection of who the VIEWER follows and who the PROFILE OWNER follows (both using the new `follows` table) -- computed at read time, not stored. Shared games = the intersection of the viewer's and profile owner's `gamesPlayed` arrays. Only shown to an authenticated viewer who isn't viewing their own profile.
- The '...' menu's Report user and Block user reuse Notifications + Report modal's (012) canonical report flow and Blocked Users' (008) existing block action directly -- no new report/block logic. 'Share profile' is a plain client-side link-copy/native-share affordance, no backend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Any visitor views a user's public profile (Priority: P1)

Anyone (authenticated or not) visits `/u/:handle` and sees that user's public identity, bio, real stats (rating/reviews, sessions), the games they play, their currently-open parties, and player reviews.

**Why this priority**: The baseline value of a public profile — everything else (following, inviting, messaging) depends on this view existing and being accurate first.

**Independent Test**: Visit a seeded user's profile as a logged-out visitor and confirm their public identity, bio, real (non-decorative) stats, games list, open postings, and reviews (or an empty state) all render correctly, with no dropped/deferred fields (online dot, reliability, groups, rank/hours, level, pronouns/languages) appearing anywhere.

**Acceptance Scenarios**:

1. **Given** a user with a bio, games, open postings, and reviews, **When** any visitor loads their `/u/:handle`, **Then** the page shows their avatar/handle/join date/bio, a rating+review-count stat and a sessions stat (both computed from real data), their games list, their currently-open hosted postings, and their reviews (or an empty "No reviews yet" state).
2. **Given** a handle that doesn't correspond to any user, **When** it's visited, **Then** a not-found response is shown (Error Pages, `002`).
3. **Given** the same profile, **When** rendered, **Then** none of the dropped wireframe elements (online indicator, reliability %, groups count, per-game rank/hours, level, pronouns/languages/timezone) appear.

---

### User Story 2 - An authenticated visitor follows, messages, or invites the profile owner to their party (Priority: P2)

A logged-in, email-verified visitor (not viewing their own profile) follows or unfollows the profile owner, starts a message conversation with them, or — if they currently host an open posting with an available seat — invites them directly to it.

**Why this priority**: The core relationship-building actions this profile page enables beyond passive viewing, but they follow from the page rendering correctly first (US1).

**Independent Test**: Follow a profile, confirm the button reflects "Following" and a subsequent unfollow reverts it; message a profile owner and confirm it opens/starts a conversation (reusing Inbox, `011`); as a host with an open posting, invite the profile owner and confirm a pending, invited-user-facing request appears in their own Inbox that they can accept or decline.

**Acceptance Scenarios**:

1. **Given** an authenticated visitor viewing someone else's profile, **When** they select "Follow," **Then** a `follows` row is created and the button shows "Following"; selecting it again removes the row and reverts the button.
2. **Given** the same visitor, **When** they select "Message," **Then** they're taken into a conversation with the profile owner (reusing Inbox's, `011`, existing start-conversation behavior).
3. **Given** a visitor who currently hosts at least one open posting with an available seat, **When** they select "Invite to a party" and choose one (if they have more than one), **Then** a new, `pending`, host-initiated Application is created for the profile owner, and it appears in the PROFILE OWNER's own Inbox as a pending request they can accept or decline — not the inviting host's.
4. **Given** the profile owner accepts the invite, **When** it resolves, **Then** it behaves exactly as an applicant-initiated acceptance would (seat count decrements, posting fills if that was the last seat, a conversation is established) — the same underlying mechanism, just a different party providing the accept/decline decision.
5. **Given** a visitor who hosts no open postings with an available seat, **When** they view "Invite to a party," **Then** it's disabled or explained, never a dead click.
6. **Given** an unauthenticated or unverified visitor, **When** they attempt any of Follow/Message/Invite, **Then** they're routed to log in or shown a verify-your-email message, respectively, consistent with every other write action.

---

### User Story 3 - An authenticated visitor sees mutual connections, reports, or blocks the profile owner (Priority: P3)

A logged-in visitor sees who they and the profile owner both follow and which games they both play, or uses the "..." menu to report or block the profile owner.

**Why this priority**: Supplementary context and safety actions, exercised less often than the primary viewing (US1) and relationship actions (US2).

**Independent Test**: As an authenticated visitor who shares mutual follows and games with a profile owner, confirm the "You have in common" sidebar shows an accurate mutual-follow count and shared-games list; select Report or Block from the "..." menu and confirm each reuses the existing canonical flows.

**Acceptance Scenarios**:

1. **Given** an authenticated visitor (not viewing their own profile) who follows at least one account the profile owner also follows, and shares at least one game with them, **When** the profile renders, **Then** the "You have in common" sidebar shows an accurate mutual-follow count/avatars and the accurately-intersected shared-games list.
2. **Given** a visitor with no mutual follows or shared games with the profile owner, **When** the profile renders, **Then** the sidebar reflects that (an empty/absent state, not a dangling zero-count section for an unauthenticated visitor, who never sees this sidebar at all).
3. **Given** the "..." menu, **When** the visitor selects "Report user" or "Block user," **Then** it opens Notifications + Report modal's (`012`) canonical report flow or performs Blocked Users' (`008`) existing block action, respectively — no new report/block logic.

---

### Edge Cases

- What happens to the wireframe's online-presence dot, reliability %, groups count, per-game rank/hours, level, and pronouns/languages/timezone? → All dropped (see Input) — real, established precedent for each.
- What happens when the viewer views their own profile? → Follow, Invite, Message, and Report/Block are not offered (can't perform any of these against yourself); the mutual-connections sidebar is also not shown.
- What happens to an invite when the inviting host's posting fills up (via another accepted application) before the invited user responds? → The invited user's accept attempt fails the same capacity check `011`'s existing `accept-request.ts` already performs for any pending application against a now-full posting — no separate check needed for the invite case.
- What happens to "sessions" for a brand-new user with no accepted applications or closed/full hosted postings? → Shows 0, not hidden.
- What happens to "Player reviews" when none exist yet? → An encouraging empty state ("No reviews yet"), not a blank section — no rating submission flow exists yet to generate one (docs/future-work.md).
- What happens to the mutual-connections sidebar for a logged-out visitor? → Not shown at all (requires an authenticated viewer to compute "you" against).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show any visitor (authenticated or not) a user's public profile at `/u/:handle`: avatar, handle, join date, bio, a rating+review-count stat, a computed sessions stat, their games list, their currently-open hosted postings, and their reviews (or an empty state).
- **FR-002**: A handle with no matching user MUST show a not-found response (Error Pages, `002`).
- **FR-003**: System MUST NOT show the dropped wireframe elements: online-presence indicator, reliability %, groups count, per-game rank/hours, level, pronouns, languages, timezone.
- **FR-004**: An authenticated, email-verified visitor viewing someone else's profile MUST be able to toggle Follow/Unfollow, with the button reflecting current state.
- **FR-005**: An authenticated, email-verified visitor MUST be able to start or resume a message conversation with the profile owner (reusing Inbox's, `011`, existing mechanism).
- **FR-006**: An authenticated, email-verified visitor who hosts at least one open posting with an available seat MUST be able to invite the profile owner to one of them; the resulting pending request MUST require the INVITED USER's (not the inviting host's) accept/decline decision, resolving identically to an applicant-initiated acceptance (seat decrement, posting-fill, conversation creation) once accepted.
- **FR-007**: A visitor with no eligible open posting MUST see "Invite to a party" disabled or explained, never a dead click.
- **FR-008**: An authenticated visitor (not viewing their own profile) MUST see a "You have in common" sidebar showing the accurate mutual-follow count and shared-games intersection with the profile owner; this sidebar MUST NOT appear for a logged-out visitor or on a user's own profile.
- **FR-009**: The "..." menu's Report user/Block user MUST reuse Notifications + Report modal's (`012`) canonical report flow and Blocked Users' (`008`) existing block action, respectively.
- **FR-010**: Unauthenticated or unverified attempts at Follow/Message/Invite/Report/Block MUST be routed to log in or shown a verify-your-email message, respectively, consistent with every other write action.

### Key Entities

- **Follows** (new table): `followerId`, `followeeId`, `createdAt`. Unfollow is a real row delete (no trust/safety history value, same exception already applied to `SavedListing`/`Likes`/`ThreadSubscription`).
- **Review** (new table, no writer yet): `revieweeId`, `reviewerId`, `rating` (1-5), `text`, `game`, `createdAt`. This feature is the first to define and display it; the rating-submission flow that would write it remains deferred platform-wide (`docs/future-work.md`) — same "ship the entity/display now, adopt the writer later" pattern as `Notification`/`AuditEntry`.
- **Applications**: Extends `006-listing-detail`'s existing table with `initiatedBy` (`applicant` \| `host`, default `applicant`). A host-initiated row still needs the invited applicant's own accept/decline decision — never auto-accepted.
- **User**: Read-only here beyond what `001`/`003` already established (`handle`, `name`, `avatarColor`, `region`, `platforms`, `ageGroup`, `gamesPlayed`, `createdAt`); no new fields added to it by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of profile views show accurate, real data for every displayed stat/section, and 0% show any of the six dropped decorative/deferred elements.
- **SC-002**: 100% of Follow/Unfollow actions immediately update the button's state and the underlying `follows` row.
- **SC-003**: 100% of accepted invites resolve identically (seat decrement, posting-fill, conversation creation) to an accepted applicant-initiated application — no divergent behavior between the two entry points.
- **SC-004**: 100% of mutual-connections/shared-games sidebars reflect an accurate, current computed intersection, never a stale or stored count.
- **SC-005**: 100% of unauthenticated/unverified write attempts (Follow/Message/Invite/Report/Block) are handled per FR-010, never a silent failure.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature. The nav's "Groups" link specifically is not functional (Groups is deferred platform-wide).
- Dropping the online indicator, reliability %, groups count, per-game rank/hours, level, and pronouns/languages/timezone are all direct applications of already-established decisions, not new open questions requiring separate confirmation — only Follow, Invite, and mutual-connections were explicitly reconfirmed in scope on 2026-07-12.
- `Review`'s rating-submission writer remains deferred — this feature only defines the entity and displays whatever exists (nothing, on a fresh install), matching the `Notification`/`AuditEntry` precedent.
- The bounded amendments to `011`'s `accept-request.ts`/`decline-request.ts`/`get-inbox-list.ts` (reversing the authorized actor and inbox surfacing for a host-initiated invite) are small, targeted branches on the new `initiatedBy` field, not a rewrite of either feature's existing applicant-initiated behavior, which remains entirely unchanged.
- A user cannot Follow, Invite, Message, Report, or Block themselves — their own profile simply doesn't offer these controls.
