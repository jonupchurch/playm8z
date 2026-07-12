# Feature Specification: Listing detail

**Feature Branch**: `006-listing-detail`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Listing detail feature for playm8z: the single-posting page at `/listing/:id`, public per resources/sitemap.md. Source of truth: resources/wireframes/playm8z - Listing.dc.html and resources/guidelines.md's Listing detail summary. Sections: header (game/genre, live recruiting badge, title, host), About + 'What I'm looking for' checklist, Details grid (vibe/platform/region/age/schedule/mic) + tags, Party roster (host + accepted members + open slots), Q&A (ask a question, host replies), and a sticky Apply panel (message + Apply for a slot, or a withdraw control once applied). Applying and asking a question are write actions gated on email verification, per Auth & Onboarding's FR-014/FR-017 (the second and third consumers of that gate, after Post a Game). The wireframe's roster shows per-slot role labels (Controller, Sentinel, Duelist, Entry/Initiator, Flex) -- this directly contradicts ADR 0004 (no structured role-matching on roster slots) and is dropped; roster slots show only filled-vs-open and Host-vs-Member, never a role/class label. No separate RosterSlot entity is needed: the roster is derived from the host plus Applications with status 'accepted' (Application already exists in the platform's data model), consistent with ADR 0004 having already removed the only thing RosterSlot would otherwise carry (a role field). Host mini-profile stats (rating, sessions, reliability%, level) shown in the wireframe are all omitted from this feature's scope, since none of them are computed anywhere in this project yet (rating/session-completion tracking and reliabilityPct are both already-deferred future work, and no leveling system has ever been decided) -- fabricating placeholder numbers isn't an option. The apply panel's Report and Save actions are deferred to future work (Report's real flow depends on the not-yet-spec'd Notifications & Report feature; Save/bookmark isn't connected to anything already decided, like Post a Game's deferred 'Save as draft'); Share is trivial and stays in scope. Accepting, declining, or removing a roster member is Inbox/messaging's job (not yet spec'd, per the sitemap's 'Apply for a slot → Message thread + Notification'), not this page's -- this feature only ever creates a pending Application or lets the applicant withdraw it themselves. The shared top nav/footer are Design System infrastructure, out of scope, same as every prior feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor applies for an open slot (Priority: P1)

An email-verified, authenticated visitor reads a listing, writes an optional message to the host, and applies for one of the open slots — seeing a confirmation, and able to withdraw later if they change their mind.

**Why this priority**: This is the entire reason the page exists — turning "I found something I like" into an actual application, the core conversion of the platform's matchmaking loop.

**Independent Test**: As a verified user viewing an open listing with available spots, submit an application with a message, confirm the confirmation state appears and a pending Application now exists, then withdraw it and confirm the apply form reappears.

**Acceptance Scenarios**:

1. **Given** a verified user viewing a listing with open spots, **When** they submit the apply form (message optional), **Then** a pending Application is created and the panel switches to a confirmation state.
2. **Given** a user with a pending application to this listing, **When** they select "Withdraw application," **Then** the application no longer counts toward this listing's pending applications and the panel returns to the apply form.
3. **Given** a user who already has a pending or accepted application to this listing, **When** the page loads, **Then** the panel reflects that existing state (confirmation or "you're in") rather than showing a fresh apply form.

---

### User Story 2 - Visitor asks a question; the host replies (Priority: P2)

An email-verified, authenticated visitor asks the host a public question about the listing; the host, viewing their own listing, replies.

**Why this priority**: A real, useful interaction the wireframe depicts explicitly, but secondary to applying itself — a listing is fully functional without a single question ever being asked.

**Independent Test**: As a verified non-host user, submit a question and confirm it appears in the thread; as the host, confirm a reply control is available on that question and that replying attaches the reply publicly.

**Acceptance Scenarios**:

1. **Given** a verified user viewing any listing, **When** they submit a non-empty question, **Then** it appears in the Q&A thread immediately, attributed to them.
2. **Given** the host viewing their own listing, **When** they reply to an unanswered question, **Then** the reply appears attached to that question for every subsequent viewer.
3. **Given** a non-host user, **When** they view the Q&A thread, **Then** they see existing questions and replies but have no reply control of their own.

---

### User Story 3 - The page reflects the listing's real, current capacity (Priority: P3)

Any visitor sees an accurate "recruiting" vs. "full" state, an accurate open-slot count and roster, and cannot apply to a listing that has no open spots, already has their own application, or is their own listing.

**Why this priority**: Correctness/guardrail concern layered on top of the primary flows (US1/US2) rather than a standalone value of its own.

**Independent Test**: View a listing with zero open spots and confirm the apply panel shows a "full" state instead of the apply form; view a listing you host and confirm no apply form is offered.

**Acceptance Scenarios**:

1. **Given** a listing with zero remaining open spots, **When** any visitor views it, **Then** the header shows a "full" (not "recruiting") state and the apply panel does not offer a way to apply.
2. **Given** a listing's host viewing their own listing, **When** the page renders, **Then** no apply form is offered to them (a host cannot apply to their own listing).
3. **Given** the roster section, **When** it renders, **Then** it shows the host, every currently-accepted applicant, and the remaining open-slot count as dashed placeholders — with no role/class label on any slot (ADR 0004).

---

### Edge Cases

- What happens to the wireframe's per-slot role labels (Controller, Sentinel, etc.)? → Dropped entirely, per ADR 0004 — roster rows show only identity and Host/Member/Open status.
- What happens when a logged-out visitor tries to apply or ask a question? → Blocked and directed to log in first (viewing the page itself requires no login, per the sitemap's public access level).
- What happens when an authenticated but unverified user tries to apply or ask a question? → Blocked with a message directing them to verify their email first (Auth & Onboarding's FR-014/FR-017 gate — this feature's second and third consumers, after Post a Game).
- What happens to an application after the applicant withdraws it? → Not hard-deleted (ADR 0005) — its status becomes `withdrawn`, distinct from a host-declined application, preserving the record.
- What happens with accepting, declining, or removing a roster member? → Entirely out of this feature's scope — that happens through the message thread an application creates, which is Inbox/messaging's job (not yet spec'd). This page only ever creates a pending application or lets the applicant withdraw it themselves.
- What happens to the host mini-profile's rating/sessions/reliability/level stats? → Omitted from this feature — none of them are computed anywhere yet (rating and reliability are both already-deferred future work; no leveling system has ever been decided). Only identity (avatar, name, handle) and a link to the full profile are shown.
- What happens with Report and Save? → Deferred to future work (`docs/future-work.md`) — Report's real flow depends on the not-yet-spec'd Notifications & Report feature, and Save isn't connected to anything already decided. Share (a trivial copy-link/native-share action) stays in scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any visitor, authenticated or not, to view a listing's full detail — header, About section with its "What I'm looking for" checklist, Details grid, tags, roster, and Q&A thread — with no login required to view.
- **FR-002**: The header MUST show a "recruiting" state when the listing has at least one open spot, and a "full" state when it has none.
- **FR-003**: The Details grid MUST show vibe, platform, region, age group, a schedule/time-slot summary, and mic-required status, plus the listing's tags.
- **FR-004**: The roster section MUST show the host, every applicant with an accepted Application, and the remaining open-slot count as dashed placeholders — with no role/class label on any slot (ADR 0004 — a slot's tag is limited to Host, Member, or Open).
- **FR-005**: System MUST allow an authenticated, email-verified visitor who is not the host and does not already have a pending or accepted application to submit an application (an optional message plus the apply action), creating a new Application with status `pending`.
- **FR-006**: Once a visitor has a pending application to a listing, the apply panel MUST show a confirmation state instead of the apply form, offering a "Withdraw application" action.
- **FR-007**: Selecting "Withdraw application" MUST set that Application's status to `withdrawn` (never hard-deleted, ADR 0005) and return the panel to the apply form.
- **FR-008**: A visitor with an already-accepted application to a listing MUST see a state reflecting that (not a fresh apply form) when they return to the page.
- **FR-009**: The apply form MUST NOT be offered to the listing's own host, or to any visitor viewing a listing with zero remaining open spots.
- **FR-010**: System MUST allow an authenticated, email-verified visitor to submit a public question on any listing.
- **FR-011**: System MUST allow only the listing's host to reply to a question on their own listing; a reply is publicly visible to every subsequent viewer once submitted.
- **FR-012**: An authenticated user who has not verified their email MUST be blocked from applying or asking a question, with a message directing them to verify their email first (Auth & Onboarding's FR-014/FR-017 gate).
- **FR-013**: A visitor who is not authenticated at all MUST be routed to log in before applying or asking a question (viewing remains open to them).
- **FR-014**: System MUST offer a "Share" action (e.g., copying the listing's URL); Report and Save are explicitly out of this feature's scope (see Assumptions).
- **FR-015**: The breadcrumb MUST link back to Browse, and its game segment MUST link to Browse pre-filtered to that game.
- **FR-016**: The host mini-profile shown alongside the listing MUST show only identity (avatar, display name, handle) and a link to that host's full profile — no rating, session count, reliability percentage, or level, since none of those are computed anywhere in this project yet.

### Key Entities

- **Posting**: Read (not modified) by this feature beyond what applying/roster-derivation implies — the same entity established by Home, Browse, and Post a Game.
- **Application**: This feature is its first real writer. Extends the documented shape (`id`, `postingId`, `applicantId`, `message`, `status`, `createdAt`) with a fourth status value, `withdrawn`, distinct from `declined` (a host's rejection) so the record stays legible about who ended it and why (ADR 0005 — nothing is hard-deleted).
- **Question**: New entity this feature introduces — a listing's Q&A thread. One row per question: who asked, the question text, an optional host reply and when it was added. Only the listing's host may ever set the reply field on their own listing's questions.
- **Roster**: Not a stored entity — derived per request from the listing's host plus its `accepted`-status Applications, with the remaining open-slot count computed as `seatsTotal - 1 - acceptedCount` (no separate `RosterSlot` table, since ADR 0004 already removed the only field — a role label — that would have distinguished one from a plain Application).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any visitor, logged in or not, can view a listing's full detail without being prompted to authenticate.
- **SC-002**: 100% of successful application submissions immediately show the confirmation state and are reflected in a subsequent page load without needing a manual refresh path beyond normal navigation.
- **SC-003**: 100% of listings with zero open spots show a "full" state and never offer an apply form to any visitor.
- **SC-004**: 100% of apply/ask-question attempts by an unverified user are blocked with a message telling them what to do next, never a silent failure.
- **SC-005**: 100% of questions submitted by a verified visitor appear in the thread immediately; 100% of host replies are visible to every subsequent viewer.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- Roster slots never carry a role/class label (ADR 0004 supersedes the wireframe's Controller/Sentinel/Duelist/Entry-Initiator/Flex labels) — only Host, Member, or Open.
- No separate `RosterSlot` entity exists; the roster is fully derived from the host plus `accepted` Applications, since ADR 0004 already removed the only field (role) that would have distinguished one from a plain Application row.
- Accepting, declining, or removing a roster member happens through the message thread an application creates (Inbox/messaging, not yet spec'd) — entirely out of this feature's scope. Manual testing before that feature exists can accept/decline an Application directly via `db:studio`, the same interim pattern used elsewhere in this project (e.g., toggling maintenance mode before Admin Settings exists).
- Host mini-profile stats (rating, sessions, reliability%, level) are omitted entirely — none are computed anywhere in this project yet, and fabricating placeholder values isn't an option. Revisit once the underlying systems (post-session rating, reliability tracking, a leveling mechanic) are ever built.
- Report and Save are deferred to `docs/future-work.md` — Report's real submission flow depends on the not-yet-spec'd Notifications & Report feature; Save/bookmark isn't connected to anything already decided in this project (the same reasoning that deferred Post a Game's "Save as draft").
- The apply message is optional, matching the wireframe's apply action not being gated on message content the way Publish is gated on game+title in Post a Game.
- The wireframe's "Usually responds in ~10 min" copy is decorative, not a real computed metric — no response-time tracking exists anywhere in this project (consistent with reliabilityPct's deferral).
- This feature depends on the `postings` table already established by Home/Browse/Post a Game, and on the `Application` entity already named in the platform's data model (`resources/guidelines.md`) — this is simply the first feature to actually create and query it.
