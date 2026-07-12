# Feature Specification: Forum Thread

**Feature Branch**: `010-forum-thread`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Forum Thread feature for playm8z: viewing a single thread and its replies at `/forum/thread/:id`, public to read (matching Forum index's pattern -- posting/liking/reporting requires login). Source of truth: resources/wireframes/playm8z - Forum Thread.dc.html. Thread header (category, HOT/PINNED badge read from the thread, title, starter, reply/view counts, Subscribe, Share), the original post styled distinctly (OP badge), a reply list (sort Top/Newest/Oldest, like/unlike, Quote, Report), a reply composer, and a right rail (thread info, related threads by shared category/tags, static forum-guidelines callout). This feature owns creating ForumReply (Forum index, 009, owns creating the ForumThread itself). The wireframe's 'TOP REPLY'/isBestAnswer badge has no real input path anywhere (no 'mark as best answer' control exists) and is dropped, distinct from the separate, real 'Top' sort (by like count), which is kept. Likes need a real per-user Like relationship (so a user can't like the same thing twice, and can unlike) -- not just an incrementing counter. Report reuses the Report entity Blocked Users (008) already introduced as its first writer; this feature becomes its second writer (targetType='forum'), still with no review/queue UI. Subscribe stores a per-user thread subscription preference only -- no notification-delivery mechanism is wired up, since Notifications isn't spec'd yet (matches the already-decided narrow scope for notification types). View count increments per page load, no per-visitor dedup (a simple counter, not real analytics)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Any visitor reads a thread and its replies (Priority: P1)

Any visitor, logged in or not, opens a thread, reads the original post and its replies, sorts replies (Top / Newest / Oldest), and sees related threads and thread stats alongside.

**Why this priority**: The entire reason a thread page exists — reading is the overwhelming majority of forum activity, and it works without ever replying.

**Independent Test**: Open a thread, confirm the original post renders distinctly (OP badge) from replies, sort replies each of the three ways and confirm order changes, and confirm the right rail shows accurate thread info and related threads.

**Acceptance Scenarios**:

1. **Given** any visitor, **When** they open a thread, **Then** the original post renders with an OP badge, the thread's category and PINNED/HOT badge (as already set on the thread — this feature doesn't set either), and accurate reply/view counts.
2. **Given** a thread's replies, **When** the visitor changes sort among Top (most liked) / Newest / Oldest, **Then** the order changes accordingly.
3. **Given** the right rail, **When** it renders, **Then** it shows accurate thread info (starter, reply count, view count, created) and a short list of related threads sharing the same category or tags.
4. **Given** any thread view, **When** the page loads, **Then** the thread's view count increments by one (a simple per-load counter, not deduplicated analytics).

---

### User Story 2 - Verified user posts a reply, optionally quoting another (Priority: P2)

An authenticated, email-verified visitor writes a reply — optionally quoting an existing reply first — and it appears in the thread immediately.

**Why this priority**: The core write action that keeps a thread alive, but secondary to reading (US1), which is what most visits to a thread actually do.

**Independent Test**: As a verified user, write and post a reply, confirm it appears immediately; select "Quote" on an existing reply, confirm the composer reflects the quoted reply, then post and confirm the new reply shows the quoted excerpt.

**Acceptance Scenarios**:

1. **Given** a verified user, **When** they write a non-empty reply and post it, **Then** it appears in the thread immediately and the reply count updates.
2. **Given** an existing reply, **When** the user selects "Quote" on it before writing their own reply, **Then** their posted reply displays the quoted reply's author and text alongside their own.
3. **Given** an unauthenticated visitor, **When** they attempt to post a reply, **Then** they're routed to log in first; an authenticated but unverified user attempting the same is blocked with a message directing them to verify their email first.

---

### User Story 3 - Verified user likes and reports content (Priority: P3)

An authenticated, email-verified visitor likes the original post or a reply (and can unlike it), and can report a reply or the thread itself to moderators.

**Why this priority**: Real engagement/safety actions, but the thread is fully functional without either — reading (US1) and replying (US2) are the primary value.

**Independent Test**: Like a reply, confirm the count increases and the control reflects "liked"; unlike it, confirm the count reverts; report a reply and confirm a Report record is created.

**Acceptance Scenarios**:

1. **Given** a verified user, **When** they like the original post or any reply, **Then** the like count increases by exactly one and the control reflects the liked state; selecting it again unlikes it, reverting the count.
2. **Given** a verified user, **When** they attempt to like something they've already liked (bypassing the UI), **Then** the system does not double-count it.
3. **Given** a verified user, **When** they report a reply or the thread, **Then** a minimal Report record is created (reusing the entity Blocked Users introduced, `targetType = forum`) — no review/queue UI is built here.

---

### Edge Cases

- What happens to the wireframe's "TOP REPLY" / best-answer badge? → Dropped — nothing produces it (no "mark as best answer" control exists anywhere); the separate, real "Top" sort (by like count) is unaffected and kept.
- What happens when a reply that's been quoted is later itself unavailable (e.g., hypothetically removed by moderation, once that exists)? → Out of scope for this spec; no moderation-removal mechanism exists yet for forum content.
- What happens to "Subscribe"? → Stores a per-user thread-subscription preference only; no notification is ever sent from this feature, since real-time/email notification delivery isn't built (consistent with the platform's already-narrowed notification scope).
- What happens if an unverified user tries to like, reply, or report? → Blocked with a message directing them to verify their email first, consistent with every other write action.
- What happens to view-count accuracy across repeated visits/refreshes by the same person? → Not deduplicated — a simple increment-per-page-load counter, not real analytics; acceptable for this feature's scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let any visitor, authenticated or not, view a thread's original post and all its replies — no login required to read.
- **FR-002**: The original post MUST render distinctly from replies (an OP indicator), and MUST reflect the thread's own `pinned`/computed-HOT state exactly as Forum index already defines it — this feature never sets either.
- **FR-003**: System MUST offer a reply sort control (Top / Newest / Oldest); "Top" MUST be a real, currently-accurate ordering by like count.
- **FR-004**: System MUST show a right rail with thread info (starter, reply count, view count, created) and a short related-threads list sharing the current thread's category or tags.
- **FR-005**: Viewing a thread MUST increment its view count by one per page load (no per-visitor deduplication required).
- **FR-006**: System MUST let an authenticated, email-verified visitor post a reply (non-empty body), appearing in the thread immediately and updating the reply count.
- **FR-007**: System MUST let a visitor optionally quote an existing reply before posting their own, carrying the quoted author and text along with the new reply.
- **FR-008**: System MUST let an authenticated, email-verified visitor like or unlike the original post or any reply exactly once each — a repeated like attempt on an already-liked target MUST NOT double-count.
- **FR-009**: System MUST let an authenticated, email-verified visitor report a reply or the thread itself, creating a minimal Report record (`targetType = forum`, reusing the entity Blocked Users introduced) — this feature builds no review/queue UI for it.
- **FR-010**: System MUST let an authenticated, email-verified visitor toggle a per-thread subscription preference; this feature does not send any notification as a result.
- **FR-011**: A visitor who is not authenticated MUST be routed to log in before replying, liking, reporting, or subscribing; an authenticated but unverified visitor MUST be blocked from each with a message directing them to verify their email first.
- **FR-012**: This feature does not create, pin, lock, or delete threads themselves — creating a thread is Forum index's (`009`) scope; pinning/locking/moderation is the future Admin Forum feature's scope.

### Key Entities

- **ForumReply**: New entity this feature introduces (as its first and only writer) — `threadId`, `authorId`, `body`, an optional `quotedReplyId` (self-referential), `likes` (a denormalized count kept in sync with the `Like` entity below), `createdAt`. No `isBestAnswer` field — dropped (see Edge Cases).
- **Like**: New entity this feature introduces — `userId`, `targetType` (`thread` \| `reply`), `targetId`, `createdAt`. One row per user per target; its presence/absence is the source of truth for "liked or not," with `ForumReply.likes`/the thread's own like count kept as a denormalized, recomputable total.
- **ThreadSubscription**: New entity this feature introduces — `userId`, `threadId`, `createdAt`. Stores the preference only; nothing currently reads it to send a notification.
- **Report**: Reused from Blocked Users (`008-blocked-users`) — this feature is its second writer, `targetType = forum`, `targetId` = the reported reply's or thread's id.
- **ForumThread**: Read (and its `replyCount`/`viewCount` updated) by this feature — the entity Forum index (`009-forum-index`) already defines and creates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any visitor, logged in or not, can read a full thread and all its replies without being prompted to authenticate.
- **SC-002**: 100% of posted replies appear immediately and are reflected in the thread's reply count without a manual refresh path beyond normal navigation.
- **SC-003**: 100% of like/unlike actions produce an accurate count — never double-counted for the same user on the same target.
- **SC-004**: 100% of reply/like/report/subscribe attempts by an unverified user are blocked with a message telling them what to do next.
- **SC-005**: "Top" sort always reflects current like counts accurately, never a stale snapshot.

## Assumptions

- The top nav bar and footer are shared Design System infrastructure, out of this feature's own scope — same reconciliation as every prior feature.
- Reading a thread requires no authentication, matching Forum index's own pattern; only replying, liking, reporting, and subscribing are gated.
- The wireframe's "TOP REPLY"/best-answer badge is dropped entirely — no control anywhere sets it, unlike the separate and real "Top" (by-likes) sort, which this feature keeps.
- Likes are modeled as a real per-user relationship (not a bare counter) so double-liking and unliking both work correctly and are enforceable server-side.
- Report reuses Blocked Users' `Report` entity (`targetType = forum`) rather than inventing a second reporting mechanism — this feature is that entity's second writer, still with no review/queue UI (Notifications & Report's eventual job).
- Subscribe only stores a preference; no notification-delivery feature exists yet to act on it (consistent with the platform's already-narrowed notification scope, see `docs/future-work.md`).
- View count increments per page load with no per-visitor deduplication — a simple counter appropriate to this project's scale, not analytics-grade tracking.
- Creating a thread remains Forum index's (`009`) scope; this feature only creates replies within an existing thread. Pinning, locking, and any other moderation action on a thread remain the future Admin Forum feature's scope.
