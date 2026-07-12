# Feature Specification: Inbox / messaging

**Feature Branch**: `011-inbox-messaging`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Inbox / messaging feature for playm8z: the two-pane messages view at `/inbox` -- authenticated only, per resources/sitemap.md. Source of truth: resources/wireframes/playm8z - Inbox.dc.html. Conversation list (search, unread badges, new-message compose modal for direct or group chats) and a chat pane (message history, composer, a request banner with Accept/Decline for pending join-requests). This feature introduces Conversation and Message, and is where Listing detail's (006) pending Applications finally get resolved -- accepting decrements the posting's seatsOpen (auto-flipping it to 'full' at zero, per the platform's existing posting-auto-fulls decision) and creates a real Conversation so chat can continue; declining just marks the Application declined. Rather than requiring Listing detail's apply action to pre-create a Conversation (which would mean amending an already-merged feature to know about an entity that doesn't exist yet from its own vantage point), a pending Application's own stored message doubles as the request thread's opening message -- Inbox's conversation list merges real Conversations with pending-Applications-where-you're-the-host as a unified list, and only creates a persisted Conversation once a request is accepted. The wireframe's online/offline presence indicators are dropped, consistent with every prior feature's decision that no presence system exists. No real-time push (WebSockets) -- messages send via a Server Action and the view re-fetches; a short client-side poll (a plain interval re-fetch, not a websocket) keeps the active conversation reasonably current without building real-time infrastructure, which is flagged as explicit future work. New-conversation contact search excludes any user blocked by, or who has blocked, the current user (Blocked Users, 008, first real consumer of its own block-enforcement contract)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User reads and sends messages in their conversations (Priority: P1)

An authenticated user views their conversation list (including any pending join-requests to postings they host), opens one, reads the history, and sends a new message.

**Why this priority**: The core value of an inbox — without reading and sending, nothing else in this feature matters.

**Independent Test**: Open an existing conversation, confirm its history renders correctly (including sender attribution in a group chat), send a message, and confirm it appears immediately and the conversation list reflects the new last-message/time.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they view `/inbox`, **Then** their conversation list shows every real conversation they're part of, plus a "request" entry for every pending Application on a posting they host, each with an accurate unread indicator.
2. **Given** the user searches the conversation list, **When** they type, **Then** it narrows to conversations/requests matching the other party's name or the associated context (game/listing title).
3. **Given** an open conversation, **When** the user sends a non-empty message, **Then** it appears immediately, the conversation's last-message preview and timestamp update, and unread state clears for the sender's own view.
4. **Given** a group conversation, **When** messages render, **Then** consecutive messages from the same sender are visually grouped, with the sender's name shown once per group, not per message.

---

### User Story 2 - User starts a new conversation (Priority: P2)

An authenticated user opens the compose modal, searches for and selects one or more people, and starts a direct or group conversation.

**Why this priority**: Necessary for a user to reach anyone they don't already have a thread with, but secondary to the core read/send loop (US1) that dominates day-to-day inbox use.

**Independent Test**: Open compose, select one contact, start a chat, confirm a new direct conversation appears and is active; repeat selecting two+ contacts and confirm a group conversation is created instead.

**Acceptance Scenarios**:

1. **Given** the compose modal, **When** the user searches, **Then** results exclude the user themselves and anyone blocked by or blocking them (Blocked Users' block relationship).
2. **Given** exactly one selected contact, **When** the user starts the chat, **Then** a direct conversation is created (or an existing one with that person is reused rather than duplicated) and becomes the active conversation.
3. **Given** two or more selected contacts, **When** the user starts the chat, **Then** a new group conversation is created (with an optional name, defaulting to the members' names) and becomes active.

---

### User Story 3 - Host accepts or declines a pending join request (Priority: P3)

A posting's host, viewing a pending-request conversation, accepts (seating the applicant and continuing as a real conversation) or declines it.

**Why this priority**: Completes the applying lifecycle Listing detail started, but is exercised far less often than ordinary message reading/sending (US1) — most conversations aren't requests.

**Independent Test**: As a host with a pending request, accept it and confirm the applicant is now reflected as an accepted roster member (Listing detail's roster) with the posting's open-slot count decremented (and the posting auto-flipping to "full" if that was the last spot); as a host with a different pending request, decline it and confirm the Application is marked declined with no roster change.

**Acceptance Scenarios**:

1. **Given** a pending-request conversation, **When** the host selects Accept, **Then** the Application's status becomes `accepted`, the posting's open-slot count decrements by one (auto-flipping the posting to `full` if it reaches zero), and a real, ongoing Conversation is created from that point forward.
2. **Given** a pending-request conversation, **When** the host selects Decline, **Then** the Application's status becomes `declined`, with no change to the posting's open-slot count, and the conversation no longer shows the request banner.
3. **Given** an accepted or declined request, **When** the host or applicant revisits it, **Then** it no longer shows Accept/Decline controls — that decision is final for this Application (a new one would be a fresh apply).

---

### Edge Cases

- What happens to the wireframe's online/offline presence indicators? → Dropped entirely — no presence-tracking system exists anywhere in this project (every prior feature that touched this made the same call).
- What happens if the receiving party doesn't have the inbox open when a message arrives? → Not addressed by a push mechanism — this feature has no real-time delivery; the conversation simply shows unread state and an accurate preview the next time they view it (a short client-side poll refreshes the active view periodically, not a websocket).
- What happens when a user attempts to start a conversation with someone who has blocked them, or whom they've blocked (bypassing the UI search exclusion)? → Rejected server-side, not just filtered from the compose search.
- What happens to a posting's roster once its host accepts a request here? → Reflected automatically — Listing detail's roster is derived from accepted Applications (`006-listing-detail`'s existing design), so accepting here is all that's needed; no separate roster-update step exists.
- What happens if two direct-message attempts target the same pair of users? → The existing direct conversation between them is reused, never duplicated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authentication to view `/inbox` — an unauthenticated visitor is routed to log in.
- **FR-002**: The conversation list MUST show every real conversation the user is part of, plus a synthesized "request" entry for every pending Application on a posting they host — unified in one list, each with an accurate unread indicator and last-activity time.
- **FR-003**: System MUST let the user search the conversation list by the other party's name or the associated context.
- **FR-004**: System MUST let the user open a conversation, view its full message history (with sender attribution grouped sensibly in a group chat), and send a new message that appears immediately.
- **FR-005**: System MUST let the user start a new direct conversation (reusing an existing one with the same person rather than duplicating it) or a group conversation (two or more people, with an optional name) via a compose flow.
- **FR-006**: The compose flow's contact search MUST exclude the user themselves and anyone with an active block relationship with them in either direction (Blocked Users' entity) — enforced server-side, not just filtered from the search UI.
- **FR-007**: A pending-request conversation MUST show an Accept/Decline banner to the posting's host; selecting Accept MUST set the Application's status to `accepted`, decrement the posting's open-slot count by one (auto-flipping the posting to `full` at zero), and establish a real, ongoing Conversation; selecting Decline MUST set the Application's status to `declined` with no change to the posting's open-slot count.
- **FR-008**: Once a request has been accepted or declined, System MUST NOT show Accept/Decline controls for it again.
- **FR-009**: System MUST NOT implement real-time (push/websocket) message delivery — messages send via a synchronous action and the view refreshes via normal navigation or a short client-side poll; true real-time delivery is explicit future work.
- **FR-010**: This feature MUST NOT implement a separate Notification entity or delivery mechanism — unread counts and conversation-list ordering are this feature's own concern; every other notification type remains out of scope, per the platform's already-narrowed notification scope.

### Key Entities

- **Conversation**: New entity this feature introduces — `isGroup`, an optional `name` (group chats only), `memberIds[]`, `lastMessageAt`. Created directly for compose-started chats; created lazily (only once a request is accepted) for what began as a pending Application.
- **Message**: New entity this feature introduces — `conversationId`, an optional `senderId` (null for system messages), `type` (`text` \| `system`), `body`, `createdAt`.
- **Application**: Read and updated by this feature (`006-listing-detail`'s entity) — this is where `pending` finally transitions to `accepted`/`declined`. A pending Application's own `message` field is treated as the request thread's opening line for display purposes, without needing a separate `Message` row until acceptance.
- **Posting**: Updated by this feature only via its `seatsOpen`/`status` fields, exclusively as a side effect of accepting an Application (never edited directly here).
- **Block**: Read by this feature (`008-blocked-users`'s entity) to exclude blocked/blocking users from compose search and to reject a direct-message attempt between blocked parties server-side.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of a user's real conversations and pending hosted requests appear in one unified, searchable list.
- **SC-002**: 100% of sent messages appear immediately in the sender's own view, with the conversation list's preview/time updating to match.
- **SC-003**: 100% of accepted requests correctly decrement the posting's open-slot count exactly once, never more, and the posting reaches `full` exactly when its count hits zero.
- **SC-004**: 100% of compose-search results exclude the user themselves and any actively blocked/blocking relationship; 100% of direct attempts to message a blocked/blocking party are rejected server-side even if attempted directly.
- **SC-005**: 0% of accepted-or-declined requests ever show Accept/Decline controls again.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- Online/offline presence is dropped entirely — consistent with Home's, Profile's, and Forum index's own prior decisions that no presence system exists.
- No real-time (websocket) delivery — messages are sent via a Server Action; a short client-side poll (a plain periodic re-fetch) keeps an open conversation reasonably current. True real-time delivery is logged to `docs/future-work.md` as an explicit future upgrade, not built here.
- Rather than requiring Listing detail's already-merged apply action to pre-create a Conversation (which didn't exist from that feature's own vantage point when it was specced), a pending Application's own stored `message` field doubles as the request thread's opening line — this feature's conversation list merges real Conversations with pending-hosted-Applications, and only persists a real Conversation once a request is accepted. This avoids retroactively amending Listing detail's docs for something this feature can resolve entirely on its own side.
- Accepting/declining a request is this feature's own scope, completing the Application lifecycle Listing detail (`006`) started and left open (its own Assumptions explicitly deferred accept/decline to "Inbox's job").
- Blocked Users' (`008`) block relationship is consulted here for the first time by another feature — compose search exclusion and a server-side rejection on direct attempts — partially resolving that feature's own noted "enforcement elsewhere is each feature's responsibility" follow-up.
