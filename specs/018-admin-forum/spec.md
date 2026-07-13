# Feature Specification: Admin Forum

**Feature Branch**: `018-admin-forum`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Admin Forum feature for playm8z: forum-moderation queue at `/admin/forum`. Source of truth: resources/wireframes/admin/playm8z - Admin Forum.dc.html and resources/guidelines.md section 8.4. Stats (in queue/user-reported/auto-flagged/actioned today), filter chips (All/Threads/Replies/Auto-flagged), queue cards (severity band, THREAD/REPLY type badge, category, thread context for replies, report-reason chips, amber AUTO-FLAG banner), inline Review/Approve/Remove, and a review drawer ('flagged content in context' with the preceding message dimmed, 'why it's here', author card with prior-warnings/forum-posts, actions: Approve & clear reports, Remove thread/reply, 🔒 Lock thread [threads only], Warn author, Ban author). Gated on role >= moderator (Error Pages' require-role.ts).

Reconciliations against already-established decisions (this is the SECOND moderation-queue feature, directly after Admin Postings, 017 -- most of its infrastructure is reused/extended rather than reinvented):
- Reuses Forum Thread's (010) existing `reports` table usage (`targetType = 'forum'`, `targetId` = a `forumThreads.id` or `forumReplies.id` -- that table has no separate column distinguishing which, since 010 never needed one; this feature's queue-building query resolves each report's `targetId` against `forumThreads` first, then `forumReplies`, to classify it and fetch its content).
- Extracts a SHARED `src/lib/moderation/reason-severity.ts` helper (this is the second feature needing report-reason-based severity, after Admin Postings, 017) -- and in doing so, corrects a mismatch Admin Postings' (017) own inline version had: both moderation wireframes' seed data use flavor-text reason labels ('Scam / phishing', 'Off-topic') that don't actually correspond to any value in the REAL, ratified `reports.reason` taxonomy (Notifications + Report modal's, 012: `spam`|`harassment`|`inappropriate`|`underage`|`impersonation`|`other`) -- the same category of wireframe-vs-ratified-decision correction this project has made repeatedly (e.g. Error Pages' 401/403 split, Home's dropped fake presence dots). The shared helper's real mapping: `underage`/`harassment` -> high, `impersonation`/`inappropriate`/`spam` -> med, `other` -> low (a catch-all with no inherent severity signal). This feature includes a small, bounded retroactive amendment to Admin Postings' (017) `get-posting-queue.ts`, switching it to import this shared helper instead of keeping its own not-quite-correct inline copy.
- Extracts a SHARED `src/lib/moderation/auto-flag-rules.ts` helper (the same fixed, deterministic banned-phrase/external-link/boosting-keyword/new-account-first-post ruleset Admin Postings, 017, introduced) -- reused by new bounded amendments to Forum Index's (009) `create-thread.ts` and Forum Thread's (010) `post-reply.ts`, and this feature includes a small, bounded retroactive amendment to Admin Postings' (017) `create-posting.ts` to import the shared version instead of its own inline copy.
- Generalizes Admin Postings' (017) `warnings` table: its original `postingId` (nullable) column is replaced with a polymorphic `targetType`/`targetId` pair (nullable text + nullable uuid, one of `posting`|`forumThread`|`forumReply`) -- the exact generalization 017's own research.md #3 anticipated ('generalize if a third distinct source appears'), now that this feature is that third source. A small, bounded retroactive amendment updates 017's `resolve-posting-report.ts` to write the new shape (`targetType = 'posting'`) instead of the old `postingId` column -- a rename, not a behavior change.
- Reuses Admin Users' (016) `forumThreads.removedAt` and `toggle-user-ban.ts` directly (no second ban implementation). Adds a NEW `forumReplies.removedAt` (that table had none before -- `016` only extended `forumThreads`), with a bounded amendment to Forum Thread's (010) `get-thread.ts` excluding removed replies from a thread's reply list (out of scope: how Forum Thread itself handles someone directly visiting an entirely-removed thread -- same carve-out `016`'s own spec already made for postings/threads).
- 'Lock thread' is new: adds `forumThreads.lockedAt` (nullable timestamp, threads only). A locked thread must actually reject new replies to be a real action rather than a decorative label -- a bounded amendment to Forum Thread's (010) `post-reply.ts` enforces this.
- 'Actioned today' (this feature's fourth stat) is NOT a new counter field -- it's the first real product-facing read of Admin Dashboard's (015) `auditEntries` table (`COUNT(*) WHERE category = 'moderation' AND targetType IN ('forumThread','forumReply') AND createdAt` is today), since this feature's five distinct resolution actions (approve/remove/warn/ban/lock) share no single field the way Admin Postings' 'removed today' could just read `removedAt` -- the audit log both features' Approve/Remove/Warn already write to is the natural unified source.
- 'Prior warnings' (author card) now counts across the generalized `warnings` table regardless of source (posting, thread, or reply) -- a user warned from Admin Postings and Admin Forum accumulates one combined count, not two separate ones. 'Forum posts' (this feature's own author-card metric, distinct from Admin Postings' 'total posts') counts that author's `forumThreads` + `forumReplies` rows."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Moderator views and filters the forum moderation queue (Priority: P1)

A moderator-or-higher user sees accurate stats (in queue/user-reported/auto-flagged/actioned today) and a queue of threads and replies needing review, filterable to All/Threads/Replies/Auto-flagged, each showing a computed severity, a THREAD/REPLY badge, category, reply context, report-reason chips, and (when applicable) an auto-flag banner.

**Why this priority**: The baseline "what needs my attention" view — everything else here (approving, removing, locking, warning, banning) starts from seeing the right queue first.

**Independent Test**: With threads and replies across each queue-membership case (open reports, auto-flag only, both, neither) seeded, confirm the four stats cards match direct counts, each filter narrows correctly, and computed severity/reason chips render correctly using the canonical reason taxonomy.

**Acceptance Scenarios**:

1. **Given** threads/replies with open reports and/or an auto-flag reason, **When** a moderator-or-higher user views this page, **Then** the four stats cards (in queue, user-reported, auto-flagged, actioned today) each show an accurate current count.
2. **Given** the queue, **When** the moderator selects a filter (All / Threads / Replies / Auto-flagged), **Then** it narrows to items of that content type or (for Auto-flagged) items with an unreviewed auto-flag reason.
3. **Given** a queue card, **When** it renders, **Then** its severity band reflects the worse of its open reports' canonical-reason severity and its auto-flag reason's fixed severity, and its report-reason chips show the canonical reason labels (Spam / Harassment / Inappropriate / Underage & safety / Impersonation / Other) — never the raw free-text a reporter entered.
4. **Given** a visitor without moderator-or-higher access, **When** they attempt to view this page, **Then** they're denied per Error Pages' access-denied behavior.
5. **Given** the queue has nothing to review under the current filter, **When** it renders, **Then** an encouraging empty state appears ("Queue clear!") instead of a blank list.

---

### User Story 2 - Moderator reviews a thread or reply in context and resolves it (Priority: P2)

A moderator-or-higher user opens a queue item's review drawer, sees the flagged content in context (the preceding message dimmed, for a reply), why it's here, and the author's card, then approves it or removes it.

**Why this priority**: The core resolution actions this queue exists for, but they follow from having first seen the queue (US1).

**Independent Test**: Open a reply's drawer, confirm the preceding message shows dimmed above the reported one; select Approve and confirm the item leaves the queue with its reports resolved and the content still visible; repeat on a different item with Remove and confirm it's hidden from Forum index/Forum Thread and "actioned today" increments.

**Acceptance Scenarios**:

1. **Given** a queue item that's a reply, **When** the moderator opens its drawer, **Then** it shows the immediately-preceding message in that thread (dimmed, for context) above the reported content (highlighted), the "why it's here" detail, and the author's join info, prior-warning count, and forum-posts count. A thread item shows no preceding-context block.
2. **Given** an open drawer, **When** the moderator selects "Approve & clear reports," **Then** every open report against that thread/reply is resolved, it's marked reviewed, the item leaves the queue, and the content remains publicly visible.
3. **Given** an open drawer, **When** the moderator selects "Remove thread"/"Remove reply," **Then** the appropriate `removedAt` is set (thread: reused `016` field; reply: this feature's new field — never a hard delete, ADR 0005), its open reports are resolved, the item leaves the queue, it no longer appears on Forum index (thread) or that thread's reply list (reply), and "actioned today" increments.
4. **Given** any resolution (Approve/Remove/Lock/Warn/Ban), **When** it completes, **Then** an audit entry is recorded, which is also what "actioned today" counts.

---

### User Story 3 - Moderator locks a thread or acts on the author (Priority: P3)

A moderator-or-higher user, reviewing a queue item, locks the thread to stop further replies (threads only), or acts on the author directly: a warning (recorded, content stays up) or a ban (account banned, and the thread/reply under review removed).

**Why this priority**: Targeted escalations used less often than the baseline approve/remove resolution (US2) — most queue items don't need thread-locking or author-level action.

**Independent Test**: Lock a reported thread and confirm a new reply attempt is rejected; warn an author from a reply's drawer and confirm their (combined, cross-feature) prior-warnings count increases; ban an author from another item's drawer and confirm their account is banned and that item's content is removed.

**Acceptance Scenarios**:

1. **Given** an open drawer for a thread, **When** the moderator selects "🔒 Lock thread," **Then** the thread's `lockedAt` is set, the item leaves the queue, an audit entry is recorded, and a subsequent attempt to reply to that thread is rejected. This action is not offered for a reply-type queue item.
2. **Given** an open drawer, **When** the moderator selects "Warn author," **Then** a warning record is created against that author (in the shared, cross-feature `warnings` table), the item's open reports are resolved and it's marked reviewed, and the content itself remains public.
3. **Given** an open drawer, **When** the moderator selects "Ban author," **Then** the author's account is banned (reusing Admin Users' `016` ban state/action), the thread/reply under review is removed (same effect as the Remove resolution), and the item leaves the queue.
4. **Given** a subsequent visit to Admin Users (`016`) or Admin Postings (`017`) for that author, **When** the moderator views their detail, **Then** the ban (if applied) and the combined prior-warnings count (if warned, regardless of which feature issued it) are both visible there too.

---

### Edge Cases

- What happens to the wireframe's flavor-text reason labels ("Scam / phishing," "Off-topic") that aren't in the ratified `reports.reason` taxonomy? → Reconciled to the canonical taxonomy's own labels (see Input) — this feature never stores or displays those exact wireframe strings.
- What happens when a `reports` row's `targetId` needs classifying? → This feature's queue query checks `forumThreads` first, then `forumReplies`, since `targetType = 'forum'` alone doesn't distinguish them (`010`'s existing design).
- What happens to a reply's "preceding message" context when the reply is the thread's first reply? → Shows the original post (thread body) as the dimmed context instead.
- What happens if a moderator tries to Lock a reply-type queue item? → Not offered — Lock is thread-only, matching the wireframe's own `isThread` gate.
- What happens to a locked thread's existing replies? → Untouched; locking only blocks new replies, it doesn't hide or remove anything already posted.
- What happens to a queue item after Approve/Warn (content stays public) if it later receives a brand-new report? → It reappears in the queue, same re-evaluation-each-time behavior as Admin Postings (`017`).
- What happens to "actioned today" across a moderator using both this feature and Admin Postings on the same day? → Each feature's own KPI only counts its own `targetType`s from the shared audit log — no double-counting, no shared counter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role ≥ moderator (`require-role.ts`) to view or act on this page; a visitor without that access MUST be denied.
- **FR-002**: System MUST show four stats cards (in queue, user-reported, auto-flagged, actioned today — the last computed from `auditEntries`, not a stored counter), each an accurate current count.
- **FR-003**: System MUST show a queue of threads and replies currently needing review — an item qualifies when it is not removed and either has at least one open report or has an auto-flag reason not yet marked reviewed.
- **FR-004**: System MUST support filtering the queue to All / Threads / Replies / Auto-flagged.
- **FR-005**: Each queue card and the drawer MUST show a severity band and reason chips computed via the shared `reason-severity.ts` helper (canonical `reports.reason` taxonomy, not wireframe flavor text) and the shared auto-flag-reason severity mapping.
- **FR-006**: The drawer MUST show the flagged content in context (the immediately-preceding message in that thread dimmed, for a reply; nothing for a thread), an accurate "why it's here," and the author's join info, current combined prior-warning count, and forum-posts count.
- **FR-007**: "Approve & clear reports" MUST resolve every open report against that item and mark it reviewed, without altering its public visibility.
- **FR-008**: "Remove thread"/"Remove reply" MUST set the appropriate `removedAt` (reusing `016`'s `forumThreads.removedAt`; this feature's new `forumReplies.removedAt`) and resolve its open reports.
- **FR-009**: "🔒 Lock thread" (threads only) MUST set `forumThreads.lockedAt`; a locked thread MUST reject new replies (bounded amendment to `010`'s `post-reply.ts`).
- **FR-010**: "Warn author" MUST create a warning record (in the shared, cross-feature `warnings` table) against the item's author and produce the same queue-clearing effect as Approve, without removing the content.
- **FR-011**: "Ban author" MUST ban the item's author (reusing `016`'s `toggle-user-ban.ts`/`bannedAt`) and MUST also remove the thread/reply under review.
- **FR-012**: Every Approve/Remove/Lock/Warn resolution MUST record an audit entry via `logAuditEntry()`.
- **FR-013**: This feature MUST add small, bounded amendments to Forum Index's (`009`) `create-thread.ts` and Forum Thread's (`010`) `post-reply.ts`, applying the shared, deterministic auto-flag ruleset (extracted from Admin Postings, `017`) at creation time.
- **FR-014**: This feature MUST retroactively amend Admin Postings' (`017`) `get-posting-queue.ts` to use the newly-shared `reason-severity.ts` helper (correcting its prior mismatch against the wireframe's non-canonical flavor labels), its `create-posting.ts` to use the newly-shared `auto-flag-rules.ts` helper, and its `resolve-posting-report.ts`/`warnings` table to use the generalized `targetType`/`targetId` shape instead of `postingId`.
- **FR-015**: A filter with no matching items MUST show the existing empty state ("Queue clear!"), never a blank list.

### Key Entities

- **ForumThread**: Extended with `autoFlagReason` (nullable text, shared 3-code taxonomy with Postings), `moderationReviewedAt` (nullable timestamp), `lockedAt` (nullable timestamp, new — blocks new replies). Reuses `removedAt` from Admin Users (`016`).
- **ForumReply**: Extended with `autoFlagReason`, `moderationReviewedAt` (same shared taxonomy/pattern), and a NEW `removedAt` (this feature's addition — `016` never added one to this table).
- **Reports**: Read from Blocked Users' (`008`) existing table, filtered to `targetType = forum`; `targetId` classified against `forumThreads`/`forumReplies`. This feature transitions matched rows' `status` to `resolved`, same as Admin Postings (`017`).
- **Warnings**: Generalized (this feature's retroactive amendment to `017`) from a posting-specific `postingId` to a polymorphic `targetType` (`posting` \| `forumThread` \| `forumReply`) / `targetId` pair — this feature is its second writer.
- **AuditEntry**: Reused from Admin Dashboard (`015`) — this feature is its second real writer (after `017`) and its first real *reader* for a product-facing stat ("actioned today").
- **User**: Read-only here — reuses Admin Users' (`016`) existing ban action for "Ban author," no new ban logic.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of stats-card counts and queue membership reflect accurate, current data (open reports and unreviewed auto-flags across both threads and replies).
- **SC-002**: 100% of severity bands and reason-chip labels are computed from the canonical `reports.reason` taxonomy, never the wireframe's non-canonical flavor strings.
- **SC-003**: 100% of Approve/Remove/Lock/Warn/Ban resolutions immediately clear the item from the queue and (except Ban, which reuses `016`'s own audit path) record an audit entry.
- **SC-004**: 100% of Remove/Ban-triggered removals hide the thread/reply from Forum index/Forum Thread without deleting the underlying row; 100% of locked threads reject new replies.
- **SC-005**: 100% of visitors without moderator-or-higher access are denied, never shown this page's content.
- **SC-006**: 0% of "actioned today" or "prior warnings" counts require a separately-maintained counter — both are always a direct, current read over existing rows (`auditEntries`/`warnings`).

## Assumptions

- The admin sidebar shell is Design System infrastructure, out of this feature's own scope, same as every prior admin feature.
- Extracting `reason-severity.ts` and `auto-flag-rules.ts` as shared helpers (rather than each feature keeping its own inline copy) is done now because a second, real consumer (this feature) exists — not speculative extraction ahead of need.
- The `warnings` table's generalization to `targetType`/`targetId` is a rename of an already-merged feature's (`017`) column, not a behavior change — every existing warning implicitly becomes `targetType = 'posting'`.
- Locking a thread only blocks new replies; it doesn't hide the thread or its existing replies, and doesn't itself resolve any of the thread's own open reports beyond the item being reviewed (which it does, per FR-009's "leaves the queue" effect, same as every other resolution).
- Banning an author from this feature's drawer always also removes the thread/reply under review — same reasoning as Admin Postings (`017`); it doesn't remove any of that author's other content (postings, other threads/replies), which remains each respective feature's own separate action.
- How Forum Thread (`010`) itself handles someone directly visiting an entirely-removed thread (as opposed to one of its replies being individually removed) remains that feature's own out-of-scope concern, per `016`'s already-established carve-out for postings/threads.
