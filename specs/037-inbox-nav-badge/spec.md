# Feature Specification: Messages in the top nav with an unread badge

**Feature Branch**: `037-inbox-nav-badge`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "There's notifications on the nav, but no way to send a message to someone" — surface the already-built Inbox (feature 011) as a first-class top-nav entry with an unread-message badge, mirroring the notification bell.

## Context

Messaging already exists end-to-end (feature 011, Inbox / Messaging): the inbox, per-conversation threads, starting a direct or group conversation, sending messages, blocking checks, and per-viewer unread counts. What is missing is **discoverability**. In the top nav a signed-in user sees a prominent notification bell (with its own unread badge), but the only way to reach the Inbox is two clicks deep inside the account dropdown menu, with no indication that unread messages are waiting. As a result the platform *feels* like it has no messaging even though it is fully built. This feature adds the missing entry point; it does not add or change any messaging capability.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reach messages in one click from anywhere (Priority: P1)

A signed-in member, on any page of the site, sees a Messages entry in the top navigation alongside the notification bell. Clicking it takes them straight to their inbox.

**Why this priority**: This is the core of the feature. Without a visible entry point, messaging is effectively undiscoverable, which is the exact complaint that prompted the work. Every other part of the feature is an enhancement on top of this one.

**Independent Test**: Sign in, load any page, confirm a Messages entry is present in the top nav and that activating it lands on the inbox. Delivers value on its own even with no badge.

**Acceptance Scenarios**:

1. **Given** a signed-in member on any page, **When** the top nav renders, **Then** a Messages entry appears in the signed-in action row next to the notification bell.
2. **Given** the Messages entry, **When** the member activates it, **Then** they arrive at the inbox.
3. **Given** a signed-out visitor, **When** the top nav renders, **Then** no Messages entry appears (the whole signed-in action row, including the bell, is absent — unchanged from today).

---

### User Story 2 - See at a glance that unread messages are waiting (Priority: P1)

A member with unread messages sees a count badge on the Messages entry, so they know to check without opening the inbox. When they have read everything, no badge shows.

**Why this priority**: The badge is what makes the entry point *actionable at a glance* and brings messaging to parity with the notification bell. It is co-equal with Story 1 for delivering the intended value.

**Independent Test**: As a member, receive a message in a conversation and don't open it; confirm the badge shows the correct count. Read the conversation; confirm the badge disappears.

**Acceptance Scenarios**:

1. **Given** a member with N unread messages (N ≥ 1) across their conversations, **When** the nav renders, **Then** the Messages entry shows a badge with the unread count.
2. **Given** a member with zero unread messages, **When** the nav renders, **Then** the Messages entry shows no badge.
3. **Given** a member with more unread messages than the display cap, **When** the nav renders, **Then** the badge shows the capped label (the same cap the notification bell uses).
4. **Given** a member who opens and views a conversation with unread messages, **When** they next load a page, **Then** those messages are no longer counted in the badge.
5. **Given** a member viewing a conversation, **When** they themselves are the sender of the most recent messages, **Then** their own messages are never counted as unread.

---

### Edge Cases

- **Only party requests/invites pending, no unread messages**: The badge shows nothing. Pending party join-requests and host invites are surfaced by the notification bell, not the Messages badge (see FR-003 and its rationale). The Messages entry is still present, just un-badged.
- **A conversation the member has never opened**: Messages in it count as unread from the conversation's creation onward (there is no read cursor for the member yet), consistent with how the inbox page already derives unread state.
- **System messages** (e.g. "@applicant joined the party") with no human sender: counted as unread the same as any other message the member hasn't read — they legitimately represent new activity in the conversation.
- **A group conversation**: unread messages from any other member count toward the badge, the same as a direct conversation.
- **Maintenance mode**: the top nav is not rendered at all in maintenance mode; the Messages entry inherits that behavior with no special handling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The top navigation MUST show a Messages entry for signed-in members, positioned in the signed-in action row next to the notification bell, that navigates to the inbox when activated.
- **FR-002**: The Messages entry MUST display an unread-count badge when the member has one or more unread messages, and MUST display no badge when the count is zero.
- **FR-003**: The unread count MUST include only unread direct and group **messages**. It MUST NOT include pending party join-requests or pending host invites. *(Rationale: those already surface in the notification bell; counting them here as well would double-count the same event across two nav icons. "Messages" means conversations only.)*
- **FR-004**: A message MUST be counted as unread for a member when it was created after that member's last-read time for its conversation and was not sent by that member. A member with no recorded last-read time for a conversation MUST have its messages counted from the conversation's creation time. *(This is the same unread rule the inbox page already applies; the two MUST stay consistent.)*
- **FR-005**: The badge's large-number cap and label MUST match the notification bell's existing behavior, so the two badges are visually and numerically consistent.
- **FR-006**: The Messages entry MUST be reachable and correct on every authenticated page render without a measurable slowdown to page load (see SC-003); computing the count MUST NOT scale its query volume with the number of conversations the member has.
- **FR-007**: The Messages entry MUST NOT be shown to signed-out visitors, and the signed-out top nav MUST be unchanged by this feature.
- **FR-008**: The Messages entry MUST carry an accessible name that conveys the unread count to assistive technology (e.g. "Messages, 3 unread" / "Messages, no unread"), and the unread state MUST NOT be communicated by color alone.
- **FR-009**: The redundant Inbox link MUST be removed from the account dropdown menu, leaving the top-nav Messages entry as the single primary way into the inbox. The remaining dropdown items (profile, log out) MUST be unchanged.
- **FR-010**: The badge count MUST reflect the member's unread state as of page render (consistent with how the notification bell's count is produced); live/pushed updates are not required.

### Key Entities *(include if feature involves data)*

- **Conversation**: an existing direct or group thread the member belongs to; already records each member's last-read time. No new fields.
- **Message**: an existing message within a conversation, with a creation time and an optional sender. No new fields.
- **Unread message count (derived)**: a single number for the viewing member — the count of messages across their conversations that satisfy the unread rule (FR-004). Not stored; computed at render.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any page, a signed-in member can reach their inbox in a single interaction with the top nav (one click), versus the two-step account-menu path that exists today.
- **SC-002**: The badge count exactly equals the number of unread messages the member would see reflected in their inbox's per-conversation unread indicators (no drift between the nav badge and the inbox page for the same member at the same moment).
- **SC-003**: Adding the Messages entry does not add a perceptible delay to authenticated page loads; the unread count is produced with a fixed, small number of data reads regardless of how many conversations the member has.
- **SC-004**: A member who has read all their messages sees no badge; a member with unread messages always sees an accurate count (capped for large values), with the state available to assistive technology.

## Assumptions

- Feature 011 (Inbox / Messaging) is present and owns all messaging behavior; this feature only adds a navigation entry point and an unread indicator on top of it.
- The notification bell is the correct visual and accessibility reference for the badge (cap, label, non-color indication); its behavior is treated as the standard to match and is not itself changed.
- "Unread" for the nav badge is defined identically to the inbox page's existing per-conversation unread derivation, so the two never disagree.
- Party join-requests and host invites remain the notification bell's responsibility, not the Messages badge's — the inbox *page* may still merge them into its list; only the nav *badge* is messages-only.
- A preview dropdown of recent conversations (bell-style) is intentionally not part of this feature; the Messages entry is a link, not a disclosure widget.
- The count is computed at page render, matching the notification bell; real-time delivery is out of scope.

## Out of Scope

- Building or changing any messaging capability (starting conversations, sending, blocking, the compose flow, the inbox page contents) — feature 011 owns all of it.
- A message-preview dropdown on the Messages entry (future work; would bring bell parity).
- Real-time or pushed unread updates.
- Counting party join-requests or host invites in the Messages badge.
- Any change to the notification bell.
- Any change to what the inbox page displays or to the inbox list's existing behavior.
