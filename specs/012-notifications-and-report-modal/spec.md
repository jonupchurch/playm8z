# Feature Specification: Notifications + Report modal

**Feature Branch**: `012-notifications-and-report-modal`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Notifications + Report modal feature for playm8z: a bell dropdown (nav-level) plus a full /notifications page (filters: All/Unread/Requests/Forum/System, grouped Today/Earlier, mark-read/mark-all-read), and a reusable, canonical 3-step Report modal (reason taxonomy -> optional details + 'also block' checkbox -> done). Source of truth: resources/wireframes/support/playm8z - Notifications & Report.dc.html. Introduces the Notification entity (guidelines.md's documented shape: type join|accepted|reply|mention|message|rating|news|system, actorId?, text, targetRef, read). Pending join-request notifications reuse Inbox's (011) existing accept-request.ts/decline-request.ts Server Actions rather than duplicating that logic. The Report modal gives Blocked Users' (008) already-existing `reports` table a real `reason` enum (spam|harassment|inappropriate|underage|impersonation|other) it didn't have before (that feature never collected one), and an 'also block' option that reuses Blocked Users' existing block-creation logic. Retroactively resolves Listing detail's (006) explicitly-deferred Report button, since the blocker it was waiting on (this feature existing) is now resolved -- Listing detail's docs get a small follow-up amendment for this, tracked alongside this feature's own work. Adopting the same canonical modal on Blocked Users' existing (simpler) report checkbox and Forum Thread's existing (bare) Report button is logged as optional follow-up polish in docs/future-work.md, not done in this pass -- both already work today with a minimal report record; this feature doesn't need to touch either to ship. Actually wiring every other write action (apply, accept/decline, forum reply, mention, direct message) to call this feature's createNotification() helper is each of those already-existing features' own follow-up, tracked in docs/future-work.md -- this feature provides and unit-tests the mechanism and demonstrates the UI against seeded/test data, not a live end-to-end retrofit of the whole platform's write actions in one pass. The 'rating' notification type is kept in the enum (guidelines.md already documents it) for future compatibility, but this feature never actually creates one, since post-session ratings remain deferred platform-wide."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User views, filters, and clears their notifications (Priority: P1)

An authenticated user checks the bell dropdown for a quick recent-unread preview, or the full notifications page for the complete history, filters by category, and marks one or all as read.

**Why this priority**: The baseline value of a notification system — without viewing/filtering/clearing, nothing else here matters.

**Independent Test**: With a mix of read/unread notifications across categories, open the bell dropdown and confirm an accurate unread count and preview; visit the full page, filter by each category, mark one as read and confirm the count updates, then mark all read.

**Acceptance Scenarios**:

1. **Given** an authenticated user with unread notifications, **When** they open the bell dropdown, **Then** it shows an accurate unread count and a short preview of the most recent unread ones, with a link to the full page.
2. **Given** the full notifications page, **When** the user selects a filter (All / Unread / Requests / Forum / System), **Then** the list narrows accordingly, grouped by Today / Earlier.
3. **Given** an unread notification, **When** the user selects it, **Then** it's marked read and the unread count decrements; selecting "Mark all read" clears every unread indicator at once.
4. **Given** a filter with nothing to show, **When** it renders, **Then** an empty state appears ("You're all caught up") instead of a blank list.

---

### User Story 2 - User accepts or declines a pending join request from a notification (Priority: P2)

A host sees a pending join-request notification and accepts or declines it directly from the notification row, without needing to go to Inbox first.

**Why this priority**: A convenient shortcut into a flow that already fully works (Inbox, `011`); this feature just surfaces the same action from a second entry point.

**Independent Test**: With a pending join-request notification, select Accept directly from the notification row and confirm it resolves exactly as it would from Inbox (Application accepted, posting's open-slot count decremented, a conversation established); repeat with Decline on a different one.

**Acceptance Scenarios**:

1. **Given** a pending join-request notification, **When** the user selects Accept or Decline directly from the notification row, **Then** it resolves via the same Server Actions Inbox already uses (`011-inbox-messaging`'s `accept-request.ts`/`decline-request.ts`) — no duplicated accept/decline logic.
2. **Given** a request notification that's already been resolved (from either entry point), **When** it's shown again, **Then** it displays a resolved state (e.g., "You added X to your party" / "Request declined"), never the Accept/Decline controls again.

---

### User Story 3 - User reports content via the canonical report flow (Priority: P3)

An authenticated, email-verified user reports a piece of content or a person through a reusable three-step modal: pick a reason, optionally add details and block the user, then see confirmation.

**Why this priority**: A real safety mechanism, but exercised far less often than reading notifications (US1) or resolving requests (US2) — most sessions never open it.

**Independent Test**: Open the report flow against a target, pick a reason, add optional details, check "Also block," submit, and confirm both a Report record (with the chosen reason) and a new Block record now exist.

**Acceptance Scenarios**:

1. **Given** the report modal's first step, **When** the user picks a reason and continues, **Then** the second step shows that reason and an optional details field.
2. **Given** the second step, **When** the user submits (details optional), **Then** a Report record is created with the chosen reason and any details, and the modal shows a confirmation step.
3. **Given** the second step, **When** the user also checks "Also block this user" before submitting, **Then** a Block record is created in the same submission (reusing Blocked Users' existing block-creation logic), and the confirmation copy reflects that a block happened too.
4. **Given** an unauthenticated or unverified visitor, **When** they attempt to open or submit the report flow, **Then** they're routed to log in or blocked with a verify-your-email message, respectively, consistent with every other write action.

---

### Edge Cases

- What happens to the "rating" notification type? → Kept in the type enum for future compatibility (already documented in `guidelines.md`), but this feature never actually creates one — post-session ratings remain deferred platform-wide.
- What happens to actually triggering notifications from other features' write actions (a new application, an accepted/declined request, a forum reply, a mention, a direct message)? → Out of this feature's own scope — each already-existing feature gets its own follow-up amendment to call this feature's `createNotification()` helper, tracked in `docs/future-work.md`. This feature ships and demonstrates the mechanism itself, tested against seeded data.
- What happens to Blocked Users' existing "Also report" checkbox and Forum Thread's existing bare "Report" button? → Both already work today with a minimal report record (no reason). Upgrading either to use this feature's canonical modal is optional follow-up polish, logged to `docs/future-work.md`, not required for this feature to ship.
- What happens to Listing detail's previously-deferred Report button? → Retroactively resolved — the blocker it was waiting on (this feature) now exists, so Listing detail's docs get a small follow-up amendment wiring its Report action to this feature's modal (tracked alongside this feature, not left open-ended like the other two).
- What happens when someone attempts to accept/decline the same request notification twice (e.g., two browser tabs)? → The underlying Server Actions (Inbox's) already guard against acting on an already-resolved Application; this feature doesn't need its own separate guard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show an authenticated user a bell dropdown (accurate unread count, a short preview of recent unread notifications, a link to the full page) and a full `/notifications` page.
- **FR-002**: The full page MUST support filtering (All / Unread / Requests / Forum / System) and group results by Today / Earlier.
- **FR-003**: Selecting an unread notification MUST mark it read; "Mark all read" MUST clear every unread indicator at once.
- **FR-004**: A filter with no matching notifications MUST show an empty state, never a blank list.
- **FR-005**: A pending join-request notification MUST offer Accept/Decline controls that resolve via Inbox's existing `accept-request.ts`/`decline-request.ts` Server Actions — no separate accept/decline implementation. Once resolved, it MUST show a resolved state instead of the controls, from either entry point.
- **FR-006**: System MUST provide a reusable, three-step report flow (pick a reason from a fixed taxonomy → optional details and an "also block" option → confirmation) usable against any reportable target (a user, posting, forum thread/reply, or message).
- **FR-007**: Submitting the report flow MUST create a Report record (reusing Blocked Users' `reports` table) with the chosen reason and any details; checking "Also block this user" MUST additionally create a Block record in the same submission (reusing Blocked Users' existing block-creation logic).
- **FR-008**: Opening or submitting the report flow MUST require authentication and email verification, consistent with every other write action; an unauthenticated visitor is routed to log in, an unverified one is blocked with a message directing them to verify first.
- **FR-009**: System MUST provide a `createNotification()` mechanism other features can call to generate a notification — this feature does not itself retrofit every other feature's write actions to call it (see Assumptions).
- **FR-010**: This feature MUST retroactively resolve Listing detail's (`006-listing-detail`) previously-deferred Report action, wiring it to this feature's report flow — tracked as a small follow-up amendment alongside this feature's own work.

### Key Entities

- **Notification**: New entity this feature introduces — `userId`, `type` (`join` \| `accepted` \| `reply` \| `mention` \| `message` \| `rating` \| `news` \| `system`), an optional `actorId`, `text`, `targetRef` (a path/URL the notification links to), `read`, `createdAt`.
- **Report**: Extends Blocked Users' (`008-blocked-users`) existing table — this feature is the first to actually populate its `reason` column with real values from a fixed taxonomy (spam, harassment, inappropriate content, underage/safety, impersonation, other); Blocked Users' and Forum Thread's (`010-forum-thread`) existing writes continue to leave it null, unaffected.
- **Block**: Reused from Blocked Users (`008-blocked-users`) — this feature's report flow is a second, optional trigger for creating one, alongside Blocked Users' own dedicated flow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of unread counts and previews shown in the bell dropdown accurately reflect actual unread notifications at the time of viewing.
- **SC-002**: 100% of filter/grouping combinations on the full page produce an accurate, correctly-grouped result set.
- **SC-003**: 100% of Accept/Decline actions taken from a notification produce the exact same result as taking the same action from Inbox — no divergent behavior between the two entry points.
- **SC-004**: 100% of submitted reports create exactly one Report record with the chosen reason; 100% of "also block" submissions additionally create exactly one Block record.
- **SC-005**: 100% of report-flow attempts by an unauthenticated or unverified visitor are handled per FR-008, never a silent failure.

## Assumptions

- The top nav bar and footer (aside from the bell, which this feature adds to it) are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- This feature does not retrofit every other write action (applying, accepting/declining, replying, mentioning, messaging) to actually call `createNotification()` — that's each already-existing feature's own follow-up amendment, tracked in `docs/future-work.md`. This feature ships and unit-tests the mechanism itself, demonstrated against seeded/test notification data for its own UI's sake.
- The "rating" notification type stays in the enum for future compatibility (per `guidelines.md`) but is never actually created by this feature — post-session ratings remain deferred platform-wide.
- Blocked Users' (`008`) existing "Also report" checkbox and Forum Thread's (`010`) existing bare "Report" button both already function (a minimal report record, no reason) — adopting this feature's richer canonical modal on either is optional follow-up polish, logged to `docs/future-work.md`, not required here.
- Listing detail's (`006-listing-detail`) previously-deferred Report action is retroactively resolved by this feature (FR-010) — a small, tracked follow-up amendment to that feature's docs, not an open-ended "maybe later" item like the other two.
- Accept/Decline on a request notification reuses Inbox's (`011`) existing Server Actions rather than re-implementing the same Application/Posting/Conversation transaction a second time.
