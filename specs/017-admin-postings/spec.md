# Feature Specification: Admin Postings

**Feature Branch**: `017-admin-postings`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Admin Postings feature for playm8z: posting-moderation queue at `/admin/postings`. Source of truth: resources/wireframes/admin/playm8z - Admin Postings.dc.html and resources/guidelines.md section 8.3. Stats (in queue/user-reported/auto-flagged/removed today), filter chips (All/User-reported/Auto-flagged), queue cards (severity band, game/title/blurb, author, report-reason chips, amber AUTO-FLAG banner), inline Review/Approve/Remove, and a review drawer (full posting, 'Why it's here', author card with prior-warnings/total-posts, actions: Approve & clear reports, Remove posting, Warn author, Ban author). Gated on role >= moderator (Error Pages' require-role.ts, reusing the same gate Admin Dashboard and Admin Users already use).

Reconciliations against already-established decisions:
- Reuses Blocked Users' (008) `reports` table (targetType='posting') and this feature is the FIRST to ever transition `reports.status` away from its 'open' default -- Approve/Remove/Warn/Ban-triggered-remove all resolve every open report against the acted-on posting to 'resolved'. No new status value is introduced (no separate 'dismissed'); a later Admin Reports (019) feature can add one if it turns out to need a real distinction, not invented speculatively here.
- Reuses Admin Users' (016) `postings.removedAt` (Remove sets it, never a hard delete, ADR 0005) and its `toggle-user-ban.ts` Server Action directly for 'Ban author' (no second ban implementation).
- The wireframe's per-item severity band (high/medium/low) reads as arbitrarily hand-set demo data, not a real stored field -- consistent with this project's repeated preference for computed-over-stored status (Error Pages' HOT, Admin Users' Flagged), this feature computes it instead: the worse of (a) each open report's reason-implied severity, reusing the exact same reason-keyword severity mapping already established for report-reason chips (scam/harassment/underage->high, spam/inappropriate->med, else low) and (b) the posting's auto-flag reason code's own fixed severity (see below). No severity column is added anywhere.
- 'Auto-flagged' postings need a real, deterministic source, not just decorative seed data -- this feature adds a small, bounded amendment to Post a Game's (005) existing `create-posting.ts` Server Action: at creation time, a fixed, small keyword/pattern check sets a new nullable `autoFlagReason` code (one of `phishing_or_scam`, `boosting_service`, `new_account_first_post`) when matched. This is deterministic keyword/account-age matching, not a learned filter or external service -- proportionate to this feature's own needs, not a general content-moderation platform.
- 'Prior warnings' needs a real entity -- this feature introduces a new, minimal `warnings` table (this feature's first writer), the same 'first feature that needs a shared entity defines its minimal shape' pattern already used for Notification/AuditEntry/Reports. Warn author writes a row; it does not additionally notify the warned user in-app (see Assumptions) -- the same 'ship the mechanism, don't retrofit every caller' precedent Notifications + Report modal (012) already established for itself.
- This feature is the first real caller of Admin Dashboard's (015) `logAuditEntry()` helper, which shipped with no callers yet. Approve/Remove/Warn each log an entry. This feature also includes a small, bounded retroactive amendment to Admin Users' (016) already-existing `toggle-user-ban.ts` and `remove-user-content.ts` Server Actions, adding the `logAuditEntry()` call each was always intended to eventually get (015's own spec explicitly anticipated 'Admin Users/Postings/Forum/News' as its real callers) -- a few added lines in two already-written files, not a spec rewrite of 016.
- This feature also includes a small, bounded retroactive amendment to Admin Dashboard's (015) `get-dashboard-kpis.ts` ('Live postings') and `get-top-games.ts` queries: both filter `postings WHERE status = 'open'` but predate `postings.removedAt` (added later by 016), so a removed-but-still-'open' posting currently over-counts as live. Both queries gain an `AND removedAt IS NULL` condition -- the same single-clause amendment pattern 016 already used on Home/Browse/Forum index.
- 'Ban author' bans the account (016's existing bannedAt/toggle-user-ban.ts) AND removes the specific posting under review (matching the wireframe's own demo behavior, where onBan resolves the queue item the same way onRemove does) -- banning someone without also removing the offending posting under review would leave the exact content that triggered the ban still live.
- 'Warn author' leaves the posting itself untouched (still public) -- it resolves the posting's open reports and marks it reviewed (see Key Entities' `moderationReviewedAt`), but only writes a warning record against the author, it does not remove content."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Moderator views and filters the moderation queue (Priority: P1)

A moderator-or-higher user sees accurate stats (in queue/user-reported/auto-flagged/removed today) and a queue of postings needing review, filterable to all/user-reported/auto-flagged, each showing a computed severity, game/title/blurb, author, report-reason chips, and (when applicable) an auto-flag banner.

**Why this priority**: The baseline "what needs my attention" view — everything else here (approving, removing, warning, banning) starts from seeing the right queue first.

**Independent Test**: With postings across each queue-membership case (open user reports, auto-flag only, both, neither) seeded, confirm the four stats cards match direct counts, each filter narrows correctly, and computed severity/reason chips render correctly.

**Acceptance Scenarios**:

1. **Given** postings with open reports and/or an auto-flag reason, **When** a moderator-or-higher user views this page, **Then** the four stats cards (in queue, user-reported, auto-flagged, removed today) each show an accurate current count.
2. **Given** the queue, **When** the moderator selects a filter (All / User-reported / Auto-flagged), **Then** it narrows to postings with at least one open report (User-reported) or postings with only an auto-flag reason and no open reports (Auto-flagged).
3. **Given** a queue card, **When** it renders, **Then** its severity band reflects the worse of its open reports' reason-implied severity and its auto-flag reason's fixed severity — never a manually-set value.
4. **Given** a visitor without moderator-or-higher access, **When** they attempt to view this page, **Then** they're denied per Error Pages' access-denied behavior.
5. **Given** the queue has nothing to review under the current filter, **When** it renders, **Then** an encouraging empty state appears ("Queue clear!") instead of a blank list.

---

### User Story 2 - Moderator reviews a posting in the drawer and resolves it (Priority: P2)

A moderator-or-higher user opens a queue item's review drawer, sees the full posting, why it's here (auto-flag reason and/or each report with its reporter), and the author's card (prior warnings, total posts), then approves it (clearing its reports) or removes it (hiding it platform-wide).

**Why this priority**: The core resolution actions this queue exists for, but they follow from having first seen the queue (US1).

**Independent Test**: Open a queue item's drawer, confirm it shows the full posting, why-it's-here detail, and an accurate author card; select Approve and confirm the item leaves the queue with its reports resolved and the posting still public; repeat on a different item with Remove and confirm it's hidden from Home/Browse and "removed today" increments.

**Acceptance Scenarios**:

1. **Given** a queue item, **When** the moderator opens its drawer, **Then** it shows the full posting, an accurate "why it's here" (the auto-flag reason if present, each open report with who reported it, or a "no user reports" note if auto-flag-only), and the author's join info, prior-warning count, and total-posts count.
2. **Given** an open drawer, **When** the moderator selects "Approve & clear reports," **Then** every open report against that posting is resolved, the posting is marked reviewed, the item leaves the queue, and the posting remains publicly visible.
3. **Given** an open drawer, **When** the moderator selects "Remove posting," **Then** the posting's `removedAt` is set (never a hard delete, ADR 0005), its open reports are resolved, the item leaves the queue, it no longer appears on Home/Browse, and "removed today" increments.
4. **Given** either resolution, **When** it completes, **Then** an audit entry is recorded (this feature's first real use of `logAuditEntry()`).

---

### User Story 3 - Moderator warns or bans the author from the drawer (Priority: P3)

A moderator-or-higher user, reviewing a queue item, decides the author themselves needs action: a warning (recorded against their account, posting stays up) or a ban (account banned, and the posting under review removed).

**Why this priority**: A targeted author-directed escalation, used less often than the baseline approve/remove resolution (US2) — most queue items are resolved without needing to act on the author's account at all.

**Independent Test**: Open a queue item's drawer, select Warn author; confirm a warning record now exists, the posting stays public, and the item leaves the queue. Repeat on a different item with Ban author; confirm the author's account is banned (016's existing ban state), the posting under review is removed, and the item leaves the queue.

**Acceptance Scenarios**:

1. **Given** an open drawer, **When** the moderator selects "Warn author," **Then** a warning record is created against that author, that posting's open reports are resolved and it's marked reviewed (same queue-clearing effect as Approve), and the posting itself remains public.
2. **Given** an open drawer, **When** the moderator selects "Ban author," **Then** the author's account is banned (reusing Admin Users' existing ban state/action), the posting under review is removed (same effect as Remove), and the item leaves the queue.
3. **Given** a subsequent visit to Admin Users for that author, **When** the moderator views their detail drawer, **Then** the ban (if applied) and the incremented prior-warnings count (if warned) are both visible there too — the same underlying state, not a separate copy.

---

### Edge Cases

- What happens to the wireframe's per-item severity band? → Computed (never stored), from the worse of open-report-reason severity and auto-flag-reason severity — see Input's reconciliation.
- What happens when a posting has both open reports and an auto-flag reason? → It counts toward "User-reported" (not "Auto-flagged") for filtering purposes, and its drawer shows both the AUTO-FLAG banner and the reporter list — matching the wireframe's own demo data.
- What happens when a posting has an auto-flag reason but no open reports? → It counts toward "Auto-flagged," and its drawer's "why it's here" shows only the auto-flag banner plus a "no user reports" note.
- What happens to a queue item after Approve/Warn (posting stays public) if it later receives a brand-new report? → It reappears in the queue — queue membership is re-evaluated from current open reports each time, not a one-time decision.
- What happens to a queue item after Remove/Ban (posting removed)? → It cannot reappear from a new report against the same posting, since removed postings are excluded from the queue entirely (same `removedAt` exclusion as Home/Browse).
- What happens to "removed today"? → Counts every posting with `removedAt` set to today, regardless of whether it was removed from this feature's queue or from Admin Users' (016) drawer — one shared field, one accurate count, not double-tracked.
- What happens to search/filter combined with no matches? → The existing "Queue clear!" empty state, same as an empty queue overall.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role ≥ moderator (`require-role.ts`) to view or act on this page; a visitor without that access MUST be denied.
- **FR-002**: System MUST show four stats cards (in queue, user-reported, auto-flagged, removed today), each an accurate current count.
- **FR-003**: System MUST show a queue of postings currently needing review — a posting qualifies when it is not removed and either has at least one open report (`targetType = posting`) or has an auto-flag reason not yet marked reviewed.
- **FR-004**: System MUST support filtering the queue to All / User-reported (has ≥1 open report) / Auto-flagged (auto-flag reason present, no open reports).
- **FR-005**: Each queue card and the drawer MUST show a severity band computed from the worse of (a) its open reports' reason-implied severity and (b) its auto-flag reason's fixed severity — never a separately stored value.
- **FR-006**: The drawer MUST show the full posting, an accurate "why it's here" (auto-flag reason if present; each open report with its reporter; a "no user reports" note when auto-flag-only), and the author's join info, current prior-warning count, and total-posts count.
- **FR-007**: "Approve & clear reports" MUST resolve every open report against that posting and mark it reviewed, without altering its public visibility.
- **FR-008**: "Remove posting" MUST set the posting's `removedAt` (reusing Admin Users' `016` field/pattern, never a hard delete per ADR 0005) and resolve its open reports.
- **FR-009**: "Warn author" MUST create a new warning record against the posting's author and produce the same queue-clearing effect as Approve (reports resolved, marked reviewed), without removing the posting.
- **FR-010**: "Ban author" MUST ban the posting's author (reusing Admin Users' `016` `toggle-user-ban.ts`/`bannedAt`) and MUST also remove the posting under review (same effect as FR-008).
- **FR-011**: Every Approve/Remove/Warn resolution MUST record an audit entry via `logAuditEntry()` (this feature's first real caller).
- **FR-012**: This feature MUST add a small, bounded amendment to Post a Game's (`005`) `create-posting.ts` so new postings are checked at creation against a fixed, deterministic ruleset (banned phrase/external-link pattern, boosting-service keywords, new-account first-post) and get an `autoFlagReason` set when matched.
- **FR-013**: This feature MUST retroactively amend Admin Users' (`016`) `toggle-user-ban.ts` and `remove-user-content.ts` to also call `logAuditEntry()`, and Admin Dashboard's (`015`) `get-dashboard-kpis.ts`/`get-top-games.ts` to exclude `removedAt`-set postings from their `status = 'open'` counts.
- **FR-014**: A filter with no matching postings MUST show the existing empty state ("Queue clear!"), never a blank list.

### Key Entities

- **Posting**: Extended with `autoFlagReason` (nullable text: `phishing_or_scam` \| `boosting_service` \| `new_account_first_post`, set once at creation by Post a Game's amended `create-posting.ts`) and `moderationReviewedAt` (nullable timestamp, set by Approve/Warn; left null by Remove/Ban since those already exit the queue via `removedAt`). Reuses `removedAt` from Admin Users (`016`).
- **Reports**: Read from Blocked Users' (`008`) existing table, filtered to `targetType = posting` and `status = open`. This feature is the first to transition `status` to `resolved`.
- **Warnings** (new table): `userId` (the warned author), `moderatorId` (who issued it), `postingId` (nullable — the posting that prompted it), `reason` (nullable free text), `createdAt`. First feature to write this table; "prior warnings" (here and in Admin Users' drawer) is a count of a user's rows here.
- **AuditEntry**: Reused from Admin Dashboard (`015`) — this feature is its first real writer (Approve/Remove/Warn), and also the feature that finally wires Admin Users' (`016`) previously-unwired ban/remove-content actions to it.
- **User**: Read-only here (join info, `bannedAt` status) — reuses Admin Users' (`016`) existing ban action for "Ban author," no new ban logic.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of stats-card counts and queue membership reflect accurate, current data (open reports and unreviewed auto-flags).
- **SC-002**: 100% of severity bands shown are computed at render time from current report/auto-flag data, never a stored value that could drift.
- **SC-003**: 100% of Approve/Remove/Warn/Ban resolutions immediately clear the item from the queue and record an audit entry.
- **SC-004**: 100% of Remove/Ban-triggered removals hide the posting from Home/Browse without deleting the underlying row.
- **SC-005**: 100% of visitors without moderator-or-higher access are denied, never shown this page's content.
- **SC-006**: 0% of "removed today" or "prior warnings" counts require manual reconciliation — both are always a direct, current count over existing rows.

## Assumptions

- The admin sidebar shell is Design System infrastructure, out of this feature's own scope, same as Admin Dashboard (`015`) and Admin Users (`016`).
- The auto-flag ruleset (banned-phrase/external-link pattern, boosting-service keywords, new-account first-post) is a small, fixed, deterministic keyword/account-age check proportionate to this feature's own needs — not a general-purpose or learned content-moderation system, and not retroactively applied to postings created before this feature ships. `docs/feature-list.md` already anticipates a future Admin Settings (`024`, not yet spec'd) page for configuring "moderation & auto-flag rules" — that future feature can make this ruleset admin-editable; this feature intentionally hard-codes it rather than building configuration UI/storage speculatively.
- Warning an author writes a real, persisted record (visible on their Admin Users drawer and to future moderators) but does not itself send the author an in-app notification — consistent with Notifications + Report modal's (`012`) own established precedent of shipping a mechanism without retrofitting every possible caller; wiring a "you were warned"/"your posting was removed" notification is logged as optional future work, not required for this feature to ship.
- `reports.status` gains exactly one new transition (`open` → `resolved`) from this feature; no separate `dismissed` value is introduced speculatively — a future Admin Reports (`019`) feature can add one if it turns out to need the distinction.
- The retroactive amendments to Admin Users' (`016`) and Admin Dashboard's (`015`) already-written files are small, single-purpose additions (a `logAuditEntry()` call in two existing functions; an added `WHERE` condition in two existing queries) — tracked as bounded tasks within this feature, not full spec rewrites of either already-merged feature.
- Banning an author from this feature's drawer always also removes the posting under review — the same posting that presumably justified the ban shouldn't remain live afterward; this does not remove any of that author's other content (that remains Admin Users' own separate action).
