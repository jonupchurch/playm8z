# Feature Specification: Notification Wiring — real events light up the bell

**Feature Branch**: `040-notification-wiring`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Wire the notification bell to real events (finally call createNotification from write actions) — forum replies notify the thread author, @mentions notify the mentioned user, and accepting/declining a join request notifies the applicant. Exclude new-DM notifications (the Messages nav badge already covers them)."

## Context *(why this feature exists)*

The site has a notification bell and a notification feed, but almost nothing writes to it. The reusable "create a notification" mechanism was built earlier and then left with no real callers — in practice the stored-notifications half of the feed is empty in production. The bell's one working case (a host seeing who applied to their listing and whether each request is still pending) is computed live from join-request data, not from stored notifications, so it keeps working regardless.

That leaves three events that today produce **no signal anywhere**:

1. **A forum reply** — reply to someone's thread and the thread's author is told nothing.
2. **An @mention** — typing `@someone` in a forum post does nothing; there is no mention handling at all.
3. **A join request being resolved, from the applicant's side** — accepting or declining a request currently notifies nobody on the applicant's end. Declining is completely silent: the person who asked to join is never told they were turned down.

This feature connects those three events to the existing notification mechanism so the right person is actually told. It is a retrofit of already-shipped features, not new infrastructure — the feed, the bell, and the block-relationship check all already exist.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A forum reply notifies the thread's author (Priority: P1)

A player starts a forum thread. Later, someone else replies to it. The thread's author gets a notification in their bell — "{player} replied to your thread {title}" — that links back to the thread. Replying to your **own** thread notifies no one. A reply from a player the author has blocked (or who has blocked the author) produces no notification.

**Why this priority**: Forum threads are a core engagement surface, and today a reply is invisible to the person most likely to care — the author. This is the clearest "black hole" of the three and the simplest to reason about (one recipient, one event), making it the natural MVP.

**Independent Test**: Post a reply to a thread authored by a different player and confirm exactly one `reply` notification appears in that author's feed, linking to the thread; confirm replying to your own thread creates none; confirm a blocked pairing creates none.

**Acceptance Scenarios**:

1. **Given** a thread authored by player A, **When** player B posts a reply, **Then** player A has a new unread `reply` notification whose actor is B and whose link points to the thread.
2. **Given** a thread authored by player A, **When** player A replies to their own thread, **Then** no notification is created.
3. **Given** player A has blocked player B (or vice versa), **When** B replies to A's thread, **Then** no notification is created for A.
4. **Given** the notification write fails for any reason, **When** B posts the reply, **Then** the reply is still saved and B sees a normal success — the failure is invisible to the user.

---

### User Story 2 - An @mention notifies the mentioned player (Priority: P2)

A player writes a forum thread or reply that includes `@handle`. Each mentioned player who actually exists gets a `mention` notification — "{player} mentioned you in {thread}" — linking to the post. Mentioning a handle that doesn't exist does nothing. Mentioning yourself does nothing. A mention across a block relationship produces nothing. If the same person is mentioned twice in one post they get one notification. If a reply both mentions the thread author and is a reply to their thread, the author gets a single notification (the reply one), not two.

**Why this priority**: @mentions are a high-signal way to pull a specific person into a conversation, and today the syntax is inert. It ranks below replies because it introduces the one genuinely new parsing/resolution step and its dedupe rules, so it benefits from US1 being settled first.

**Independent Test**: Post a reply containing `@existinghandle`, `@nonexistent`, and the author's own `@ownhandle`; confirm exactly one `mention` notification for the real, non-self, non-blocked handle and none for the others; confirm a reply that mentions the thread author yields only the `reply` notification.

**Acceptance Scenarios**:

1. **Given** player C exists with handle `@carol`, **When** player B posts a thread or reply containing "hey @carol", **Then** C has a new unread `mention` notification linking to that post.
2. **Given** no player has the handle `@ghost`, **When** B posts "@ghost you there?", **Then** no notification is created.
3. **Given** player B is writing a post, **When** B includes their own `@handle`, **Then** B receives no self-mention notification.
4. **Given** a post mentions `@carol` twice, **When** it is saved, **Then** C receives exactly one notification.
5. **Given** B replies to A's thread and the reply text also contains `@a` (A's handle), **When** it is saved, **Then** A receives exactly one notification, of type `reply` (not also a `mention`).
6. **Given** C has blocked B, **When** B mentions `@carol`, **Then** C receives no notification.

---

### User Story 3 - Accepting or declining a join request notifies the applicant (Priority: P3)

A player asks to join someone's listing. When the host accepts, the applicant gets an `accepted` notification — "{host} accepted your request to join {game · title}". When the host declines, the applicant gets a `declined` notification — "Your request to join {game · title} was declined". Both link to the listing. The host's own view of their inbound requests is unchanged (it is computed separately and already works); this adds only the applicant's side. A block relationship between host and applicant suppresses the notification.

**Why this priority**: This closes a real dead-end — a declined applicant is told nothing today — but it affects fewer interactions per day than forum activity and is the most independent of the three, so it sequences last without blocking the others.

**Independent Test**: As a host, accept one pending request and decline another; confirm the two applicants each get exactly one notification (`accepted` / `declined`) linking to the listing, and confirm the host's own notification feed shows no new or doubled item.

**Acceptance Scenarios**:

1. **Given** applicant X has a pending request on host H's listing, **When** H accepts it, **Then** X has a new unread `accepted` notification whose actor is H and whose link points to the listing.
2. **Given** applicant Y has a pending request on host H's listing, **When** H declines it, **Then** Y has a new unread `declined` notification linking to the listing.
3. **Given** H accepts X's request, **When** H opens their own notification feed, **Then** H sees no new stored item and no duplicate of the existing live request entry.
4. **Given** H and Y are in a block relationship, **When** H declines Y's request, **Then** Y receives no notification.
5. **Given** the notification write fails, **When** H accepts X's request, **Then** the acceptance, the new conversation, and the seat count are all still correct — the failure never rolls them back.

---

### Edge Cases

- **Self-action**: replying to your own thread, or mentioning your own handle, creates no notification.
- **Unknown handle**: `@` followed by text that matches no existing player is ignored silently (no error, no notification).
- **Duplicate mentions**: the same handle mentioned multiple times in one post yields one notification.
- **Reply + mention collision**: a reply that also mentions the thread author gives the author one notification (`reply`), never two.
- **Block relationship**: any recipient (thread author, mentioned player, or applicant) who is in an active block relationship with the actor is skipped.
- **Notification write failure**: the underlying action (reply saved, thread created, request accepted/declined) always completes and reports success even if the notification cannot be written; a failure is logged, never shown, never rolled back.
- **No duplication with the live host view**: the applicant-facing accepted/declined notifications must not cause the host's own already-working request view to double up.
- **Handle punctuation boundary**: `@carol` in "email carol@example.com" or "@carol." must resolve the intended handle token and not swallow trailing punctuation or match inside an email address.
- **Mention of a deactivated/banned player**: resolves only against currently-valid player accounts; a mention of a non-resolvable account is ignored like an unknown handle.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a player posts a forum reply, the system MUST create one `reply` notification for the thread's author, unless the author is the replier.
- **FR-002**: The `reply` notification MUST identify the replier as its actor, carry human-readable text referencing the thread, and link to the thread.
- **FR-003**: When a player posts a forum thread or reply containing one or more `@handle` mentions, the system MUST create one `mention` notification for each distinct, existing, non-self mentioned player.
- **FR-004**: The system MUST resolve `@handle` mentions against existing player handles only; a mention of a handle with no matching player MUST be ignored with no notification and no error.
- **FR-005**: The system MUST deduplicate notifications per triggering post so that a player receives at most one notification for that post — repeated mentions of the same handle collapse to one, and a player who is both the replied-to author and a mentioned handle receives only the `reply` notification.
- **FR-006**: When a host accepts a pending join request, the system MUST create one `accepted` notification for the applicant, identifying the host as actor and linking to the listing.
- **FR-007**: When a host declines a pending join request, the system MUST create one `declined` notification for the applicant, linking to the listing.
- **FR-008**: The system MUST support a `declined` notification type end to end, including a sensible icon/label wherever notification types are rendered, so a declined notification displays correctly rather than as an unknown/blank type.
- **FR-009**: For every candidate recipient (thread author, mentioned player, applicant), the system MUST suppress the notification when an active block relationship exists between the actor and that recipient, reusing the existing block-relationship check.
- **FR-010**: Notification creation MUST be best-effort: if it fails, the primary action (reply saved, thread created, request accepted/declined) MUST still succeed and report success to the user, and the failure MUST NOT roll back or alter the primary action's data.
- **FR-011**: For request acceptance specifically, the notification MUST be created outside the transaction that updates request status, seat count, and the new conversation, so a notification failure cannot corrupt that atomic update.
- **FR-012**: The system MUST NOT create any notification for a new direct message, and MUST NOT alter the host's existing live view of inbound join requests — this feature only adds the three specified notification kinds.
- **FR-013**: All new notifications MUST start unread and MUST participate in the existing feed, grouping, filtering, mark-read, and unread-count behavior with no special-casing beyond the new `declined` type's display.

### Key Entities *(include if feature involves data)*

- **Notification**: an existing record delivered to one recipient player. Attributes used here: recipient, type (`reply` | `mention` | `accepted` | `declined` among the existing set), optional actor (the player who caused it), display text, a link target, read/unread, and creation time. This feature adds `declined` to the set of types produced and adds four new producers of these records; it does not change the record's shape.
- **@mention token**: a reference inside forum thread/reply text of the form `@` followed by a player handle. Not stored as its own entity — parsed transiently from the post body at creation time and resolved to a player (or discarded if it matches none).
- **Forum thread / forum reply**: existing content. The thread has an author (the `reply` recipient); both thread and reply bodies are scanned for `@mentions`.
- **Join request**: an existing request by an applicant to join a host's listing. Its acceptance/decline are the triggers for the applicant-facing `accepted` / `declined` notifications.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of forum replies to a thread authored by a different, non-blocked player result in exactly one `reply` notification to that author.
- **SC-002**: 100% of `@handle` mentions of an existing, non-self, non-blocked player in a forum thread or reply result in exactly one `mention` notification to that player, and 0% of mentions of non-existent handles produce a notification.
- **SC-003**: For any single forum post, no recipient ever receives more than one notification (measured across the reply-vs-mention and duplicate-mention cases).
- **SC-004**: 100% of accepted and 100% of declined join requests produce exactly one corresponding notification to the applicant, and the host's own request view shows zero new or duplicated items as a result.
- **SC-005**: When notification creation is forced to fail, 100% of the underlying actions (reply, thread, accept, decline) still complete successfully with their data intact (seat counts, conversation creation, and request status all correct).
- **SC-006**: Zero notifications are generated for new direct messages by this feature.

## Assumptions

- **Reply recipient is the thread author only.** Notifying every prior participant of a thread is a broader fan-out with its own design questions and is explicitly out of scope (logged to future work).
- **Mentions are parsed from forum thread and reply bodies only** — not from direct messages, listing text, or other surfaces in this feature.
- **Handles are unique and immutable**, so a resolved handle maps to exactly one player, and resolving at creation time is sufficient (no need to store the mention).
- **The `accepted` / `declined` notifications target the applicant only.** The host's inbound-request view is computed separately from stored notifications and is intentionally left untouched, which is what prevents duplication.
- **The existing block-relationship check is authoritative** for suppression and is reused rather than reimplemented.
- **Everything stays in-app.** No email or real-time/websocket delivery of these notifications is in scope; the feed is read on navigation exactly as it is today.
- **This retrofits already-shipped write actions**, so their existing automated tests will need to account for the new notification writes, and each should also assert that the primary action still succeeds when the notification write fails.

## Out of Scope

- **New direct-message notifications in the bell** — the Messages nav badge already surfaces unread DMs; adding them to the bell would double-notify (explicitly excluded by the user).
- **News / system broadcast notifications** (e.g. notifying all or followed players when a news post publishes) — a mass fan-out with its own delivery/scale design; a separate future feature.
- **Notifying all thread participants** (beyond the author) on a reply — future work.
- **Post-session rating notifications** — the rating submission flow itself is already deferred.
- **Email delivery** of any of these notifications — in-app only (only the verification email is in scope site-wide).
- **Real-time / websocket push** of notifications — unchanged; read on navigation.
