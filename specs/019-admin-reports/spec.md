# Feature Specification: Admin Reports

**Feature Branch**: `019-admin-reports`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Admin Reports feature for playm8z: the unified report-triage queue at `/admin/reports`, aggregating every report across postings, forum, profiles, and messages. Source of truth: resources/wireframes/admin/playm8z - Admin Reports.dc.html and resources/guidelines.md section 8.5. Stats (open/high-priority/resolved today/avg response); filters by target type (All/Postings/Forum/Profiles/Messages). Cards grouped by reported target (severity, target-type badge, reason, 'N reports' badge when multiple, one representative reporter's note, reported content + owner). Inline Review/Dismiss/Remove. Drawer: reporter note (+ 'N others reported this' when multiple), reported content, 'Open in [module] moderation ->' cross-link, reported-user card (prior warnings, total reports across everything), actions (Dismiss - no violation/Remove content/Warn user/Ban user). Gated on role >= moderator (Error Pages' require-role.ts).

Reconciliations against already-established decisions (this is the THIRD moderation-queue feature, sitting above Admin Postings, 017, and Admin Forum, 018, as their aggregator -- for postings/forum targets it delegates to their existing resolution actions rather than reimplementing them; for profiles and messages, two target types neither prior feature owns, it's the first real mover):
- Reports are grouped by TARGET (`targetType`+`targetId`), not shown one row per individual report row -- 'N reports' badge/count aggregates every currently-open report against that same target; the drawer shows one representative reporter's note (the earliest-filed open report) plus a '+N others reported this' summary, not a full per-report list (a deliberate simplification vs. Postings'/Forum's own drawers, which DO enumerate every report -- this feature's whole purpose is triage-at-a-glance across four different content kinds, not per-target depth, which the 'Open in [module] moderation ->' cross-link hands off to the dedicated queue for).
- 'Dismiss — no violation' is a NEW, generic action this feature introduces: it resolves every currently-open report against a target (`status` -> `resolved`, any `targetType`) without touching the target's own content or its `moderationReviewedAt` (that concept belongs to Postings'/Forum's own auto-flag-review scope, orthogonal to whether a *report* was founded) -- reusable across all four target types uniformly, and usable by a future need to dismiss without needing a target-specific implementation.
- 'Remove content' and 'Warn user' DELEGATE to each target type's existing, dedicated resolution action where one exists, rather than reimplementing: postings -> Admin Postings' (017) `resolve-posting-report.ts`; forum -> Admin Forum's (018) `resolve-forum-report.ts` (after classifying the target as a thread or reply, reusing 018's own classification logic, now extracted as a small shared `classify-forum-target.ts` helper). This guarantees a posting/thread/reply removed or warned-about via this feature behaves identically to the same action taken from its own dedicated queue (same audit entry, same `moderationReviewedAt`/`removedAt` effect) -- not a second, slightly-different implementation.
- Profiles (`targetType = user`) and messages (`targetType = message`) have no prior dedicated moderation queue -- this feature is their first real mover. 'Remove content' is NOT offered for a profile report (there's no removable 'content' object distinct from the account itself -- consistent with Admin Users', 016, and this project's repeated ADR-0005-consistent stance that an account has exactly one severe action, Ban, no second one); Dismiss/Warn/Ban remain available. For messages (011's existing table, never previously needing a soft-hide concept), this feature adds a new `messages.removedAt` (nullable, ADR 0005-consistent) plus a small, bounded amendment to Inbox's (011) conversation-view query excluding removed messages -- 'Remove content' for a message sets this.
- 'Ban user' always reuses Admin Users' (016) `toggle-user-ban.ts` directly, and -- matching Admin Postings'/Admin Forum's own 'ban also removes the offending content under review' reasoning -- additionally removes the reported content when one exists (posting/thread/reply/message); for a profile report, Ban is account-only (nothing to remove).
- 'Prior warnings' reuses the cross-feature `warnings` table (017's, generalized by 018) -- this feature is its fourth writer (Warn on a profile or message report), and further generalizes its `targetType` to allow `message` and `null` (profile reports carry no separate content id beyond the account itself, already captured by `warnings.userId`).
- 'Total reports' (drawer's owner card) is NOT merely reports against this exact target -- it's a computed, all-time count of every report where the reported party resolves to this user, across every source: direct profile reports (`targetType=user`), plus reports against any posting/thread/reply/message THEY authored. Computed at read time (same 'computed over stored' preference as every prior admin feature), not a maintained counter.
- Adds `reports.resolvedAt` (nullable timestamp) -- neither Admin Postings (017) nor Admin Forum (018) added one when they introduced the `open`->`resolved` transition, but this feature's own 'resolved today'/'avg response' stats need it. Small, bounded retroactive amendment: both `017`'s and `018`'s existing resolve actions gain `resolvedAt: now()` alongside their existing `status: 'resolved'` write (same UPDATE statement, not new logic).
- This feature's own severity computation surfaces a second small correction to the shared `reason-severity.ts` helper (018's extraction): this wireframe's own demo logic treats `impersonation` as HIGH severity (grouped with harassment/underage — a fake-staff-member phishing-for-passwords scenario in its own seed data), not the MEDIUM this project first assigned it in 018. Since severity now lives in one shared place, this is a single, bounded, single-place fix (plus its own test), not a second inconsistent copy -- exactly the payoff of having extracted it.
- 'Open in [module] moderation ->' is a plain navigational link (to `/admin/postings`, `/admin/forum`, or `/admin/users` with that item pre-selected where practical) -- not a data dependency, out of scope to specify further than 'navigates to the right already-existing page.'"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Moderator views and filters the unified report queue (Priority: P1)

A moderator-or-higher user sees accurate stats (open/high-priority/resolved today/avg response) and a queue of reported targets across postings, forum, profiles, and messages, filterable by target type, each showing computed severity, a target-type badge, the reason, a report count when multiple, one representative reporter's note, and the reported content/owner.

**Why this priority**: The baseline "what needs my attention, across everything" view — the entire point of a unified triage queue.

**Independent Test**: With reported targets seeded across all four target types (some with multiple open reports against the same target), confirm the four stats cards match direct counts, each target-type filter narrows correctly, and severity/grouping/report-count display correctly.

**Acceptance Scenarios**:

1. **Given** open reports across postings, forum, profiles, and messages, **When** a moderator-or-higher user views this page, **Then** the four stats cards (open reports, high priority, resolved today, avg response) each show an accurate current value.
2. **Given** the queue, **When** the moderator selects a target-type filter (All / Postings / Forum / Profiles / Messages), **Then** it narrows to reported targets of that type.
3. **Given** multiple open reports against the same target, **When** its card renders, **Then** it shows a single grouped card with a "N reports" count badge, not one row per report.
4. **Given** a queue card, **When** it renders, **Then** its severity reflects the worst of its open reports' canonical-reason severity (via the shared helper), and its reason label uses the canonical taxonomy, never the raw text a reporter entered.
5. **Given** a visitor without moderator-or-higher access, **When** they attempt to view this page, **Then** they're denied per Error Pages' access-denied behavior.
6. **Given** no open reports match the current filter, **When** it renders, **Then** an encouraging empty state appears ("Inbox zero!") instead of a blank list.

---

### User Story 2 - Moderator reviews a reported target and dismisses or removes it (Priority: P2)

A moderator-or-higher user opens a report's drawer, sees the representative reporter's note, the reported content in context, a cross-link to that content's own dedicated moderation queue, and the reported user's card, then dismisses the report(s) as unfounded or removes the content.

**Why this priority**: The core resolution actions this queue exists for, but they follow from having first seen the queue (US1).

**Independent Test**: Open a grouped report's drawer, confirm the representative reporter/note, "+N others reported this," reported content, and reported-user card (prior warnings, all-time total reports); select Dismiss and confirm every open report against that target resolves without touching the content; repeat on a posting/forum-target report with Remove and confirm it behaves identically to removing from that content's own dedicated queue (`017`/`018`).

**Acceptance Scenarios**:

1. **Given** a grouped report with multiple reporters, **When** the moderator opens its drawer, **Then** it shows one representative reporter's note, a "+N others reported this" summary, the reported content in context, a working "Open in [module] moderation →" link to that content's own dedicated queue (where one exists), and the reported user's join info, prior-warning count, and all-time total-reports count.
2. **Given** an open drawer, **When** the moderator selects "Dismiss — no violation," **Then** every currently-open report against that target is resolved, without altering the content's visibility or its `moderationReviewedAt` state.
3. **Given** an open drawer for a posting or forum-thread/reply target, **When** the moderator selects "Remove content," **Then** it delegates to that target's own existing resolution action (`017`'s or `018`'s), producing the exact same effect (content hidden, reports resolved, audit entry) as removing it from that feature's own queue.
4. **Given** an open drawer for a message target, **When** the moderator selects "Remove content," **Then** that specific message's `removedAt` is set (this feature's new field) and it no longer appears in that conversation on Inbox.
5. **Given** an open drawer for a profile (user) target, **When** it renders, **Then** "Remove content" is not offered — only Dismiss, Warn, and Ban are available.

---

### User Story 3 - Moderator warns or bans the reported user (Priority: P3)

A moderator-or-higher user, reviewing a report, warns the reported user (recorded, content stays up where applicable) or bans them (account banned, and the reported content removed where one exists).

**Why this priority**: Author-level escalations, used less often than the baseline dismiss/remove resolution (US2) — most reports don't need account-level action.

**Independent Test**: Warn a reported user from a message report's drawer and confirm their all-time, cross-feature prior-warnings count increases; ban a reported user from a profile report's drawer and confirm their account is banned (with no content-removal side effect, since a profile has none); ban from a posting report's drawer and confirm both the account and that specific posting are affected.

**Acceptance Scenarios**:

1. **Given** an open drawer for a posting/forum/message target, **When** the moderator selects "Warn user," **Then** it delegates to that target's dedicated warn action where one exists (`017`/`018`), or (for a message) creates a warning record directly, resolving that target's open reports without removing the content.
2. **Given** an open drawer for a profile (user) target, **When** the moderator selects "Warn user," **Then** a warning record is created against that user (with no associated content id) and the report(s) resolve.
3. **Given** an open drawer, **When** the moderator selects "Ban user," **Then** the user's account is banned (reusing Admin Users' `016` ban state/action) and, if the report targets a posting/thread/reply/message, that specific content is also removed; a profile-target ban affects the account only.
4. **Given** a subsequent visit to Admin Users (`016`), Admin Postings (`017`), or Admin Forum (`018`) for that user, **When** the moderator views their detail, **Then** the ban (if applied) and the combined prior-warnings count (if warned, regardless of which feature issued it) are both visible there too.

---

### Edge Cases

- What happens to "total reports" (drawer's owner card)? → Computed at read time across every source: direct profile reports against this user, plus reports against any posting/thread/reply/message they authored — never a maintained counter.
- What happens when a `reports` row's `targetId` is `forum`-typed? → Classified against `forumThreads` then `forumReplies` via the shared `classify-forum-target.ts` helper extracted from `018`, same as that feature's own queue.
- What happens to "resolved today"/"avg response" for `017`/`018` actions taken from THEIR OWN queues (not this feature's)? → Counted the same way — this feature's stats read the shared `reports.resolvedAt`/`status` columns regardless of which feature's UI triggered the resolution.
- What happens when a profile report and a posting report happen to concern the same underlying user? → They remain two separate queue cards (different `targetType`/`targetId`) — this feature doesn't merge across target types, only within the same one.
- What happens to "Remove content" for a profile report attempting to hide an offensive bio? → Not offered; Ban is this project's one severe account-level action (see Input) — a moderator judging a bio itself unacceptable uses Warn or Ban, not a content-removal action that doesn't exist for accounts.
- What happens to the wireframe's `impersonation`-as-high-severity demo behavior versus `018`'s prior medium assignment? → Corrected once, in the shared `reason-severity.ts` helper, now used by all three moderation features (see Input).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role ≥ moderator (`require-role.ts`) to view or act on this page; a visitor without that access MUST be denied.
- **FR-002**: System MUST show four stats cards (open reports, high priority, resolved today, avg response time), each an accurate current value computed from `reports`.
- **FR-003**: System MUST show a queue grouped by reported target (`targetType` + `targetId`), each card showing computed severity, a target-type badge, the canonical reason, a "N reports" count when more than one open report exists against that target, one representative reporter's note, and the reported content/owner.
- **FR-004**: System MUST support filtering the queue to All / Postings / Forum / Profiles / Messages.
- **FR-005**: The drawer MUST show the representative reporter's note (plus "+N others reported this" when applicable), the reported content in context, a link to that content's own dedicated moderation queue where one exists, and the reported user's join info, prior-warning count, and all-time total-reports count.
- **FR-006**: "Dismiss — no violation" MUST resolve every currently-open report against that target without altering the content's visibility or `moderationReviewedAt` state, for any target type.
- **FR-007**: "Remove content" MUST delegate to `017`'s or `018`'s existing resolution action for a posting/forum-thread/forum-reply target (same effect as acting from that feature's own queue); MUST set a message's new `removedAt` for a message target; MUST NOT be offered for a profile (user) target.
- **FR-008**: "Warn user" MUST delegate to `017`'s or `018`'s existing warn action for a posting/forum target, or directly create a `warnings` record for a profile or message target; in every case the target's open reports are resolved without removing content.
- **FR-009**: "Ban user" MUST ban the reported user (reusing `016`'s `toggle-user-ban.ts`/`bannedAt`) and, when the report targets a posting/thread/reply/message, MUST also remove that content; a profile-target ban affects the account only.
- **FR-010**: This feature MUST retroactively amend `017`'s and `018`'s resolve actions to also set `reports.resolvedAt` (new field) alongside their existing `status = 'resolved'` write.
- **FR-011**: This feature MUST retroactively correct the shared `reason-severity.ts` helper (from `018`) so `impersonation` maps to high severity (previously medium), affecting this feature, `017`, and `018` uniformly.
- **FR-012**: This feature MUST add a new `messages.removedAt` (nullable) and a small, bounded amendment to Inbox's (`011`) conversation-view query excluding removed messages.
- **FR-013**: A filter with no matching reports MUST show the existing empty state ("Inbox zero!"), never a blank list.

### Key Entities

- **Reports**: Read from Blocked Users' (`008`) existing table, across all four `targetType` values. Gains `resolvedAt` (new, via retroactive amendment to `017`/`018`, and this feature's own writer for profile/message dismissals). Grouped by `(targetType, targetId)` for queue display.
- **Messages**: Extended (`011-inbox-messaging`) with `removedAt` (nullable, new) — this feature's own capability, since no prior feature needed message moderation.
- **Warnings**: Reused/generalized (`017`, `018`) — this feature is a further writer, allowing `targetType = 'message'` or `null` (profile reports).
- **User**: Read-only here for the reported-user card — reuses Admin Users' (`016`) existing ban action; "total reports" is a computed cross-source aggregate (see Input), not stored.
- **AuditEntry**: Reused (`015`) — posting/forum delegation paths already log through `017`/`018`; this feature's own message/profile paths (Warn/Ban/Remove) also call `logAuditEntry()` directly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of stats-card values and queue groupings reflect accurate, current `reports` data across all four target types.
- **SC-002**: 100% of severity/reason display uses the canonical, corrected taxonomy — never wireframe flavor text, never the pre-correction `impersonation` severity.
- **SC-003**: 100% of posting/forum Remove/Warn actions taken from this feature produce an identical effect to the same action taken from `017`'s/`018`'s own queue (no behavioral divergence between entry points).
- **SC-004**: 100% of message removals hide that message from Inbox without deleting the row; 100% of profile reports never offer a "Remove content" control.
- **SC-005**: 100% of visitors without moderator-or-higher access are denied, never shown this page's content.
- **SC-006**: 0% of "total reports"/"resolved today"/"avg response" values require a separately-maintained counter — all are direct, current reads over existing rows.

## Assumptions

- The admin sidebar shell is Design System infrastructure, out of this feature's own scope, same as every prior admin feature.
- "Open in [module] moderation →" is a plain navigational link to the already-existing `/admin/postings`, `/admin/forum`, or `/admin/users` page — not a data dependency this feature needs to specify further.
- Delegating Remove/Warn to `017`'s/`018`'s existing actions (rather than reimplementing) means this feature has a hard dependency on both already being implemented when this feature itself is implemented — acceptable since the project-wide gate requires every feature specced before any implementation begins, and `017`/`018` are numerically and dependency-wise earlier.
- Correcting `reason-severity.ts`'s `impersonation` mapping is a one-place fix (plus its existing unit test) that automatically and correctly changes severity display in `017`/`018` too, without needing to touch either feature's own files again.
- A profile (user) report's "content" is the account/profile itself, with no separate removable object — Warn/Ban are the only content-adjacent actions available, consistent with Admin Users' (`016`) Ban-only precedent.
- "Total reports" and "resolved today"/"avg response" are computed at read time, not maintained counters — consistent with this project's repeated preference (Admin Users' "Flagged," `017`'s/`018`'s computed severity).
