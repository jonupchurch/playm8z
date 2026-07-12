# Feature Specification: Admin Dashboard

**Feature Branch**: `015-admin-dashboard`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Admin Dashboard feature for playm8z: the moderator-or-higher landing page at `/admin`. Source of truth: resources/wireframes/admin/playm8z - Admin Dashboard.dc.html. KPI cards (total users, active today, new signups, live postings, open reports), a 7-day activity chart with a metric switcher (Signups/Active/Postings), a recent-activity feed, Needs-attention cards (user reports/posting review/forum review counts, routing to the not-yet-spec'd Admin Postings/Admin Forum/Admin Reports queues), and Top games today (by open parties). The admin sidebar shell shown in the wireframe is Design System infrastructure (exempt from the per-feature gate, per docs/feature-list.md) -- this feature owns only the main content area, not the sidebar itself, though the sidebar's live queue-count badges read the same counts this feature computes. Gated on role >= moderator, reusing Error Pages' require-role.ts (its second real consumer, after Content Page). Introduces a minimal AuditEntry entity (guidelines.md's documented shape) for the recent-activity feed and a logAuditEntry() helper -- this feature doesn't retrofit any other feature to call it, since the admin features that would generate real entries (Admin Users, Admin Postings, Admin Forum, Admin News) aren't spec'd yet; the feed is empty/sparse until they exist, same 'define now, adopt later' pattern already used for createNotification(). 'Active today' is redefined as 'distinct users with a timestamped action today' (a posting, application, forum post/reply, or message), derived from existing tables' createdAt columns -- not a presence-tracking system, consistent with every prior feature's rejection of building one. Needs-attention counts and Open reports both reuse the existing reports table (Blocked Users, 008), grouped by targetType, rather than a separate auto-flag queue system."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Moderator views platform-wide KPIs and activity trends (Priority: P1)

A moderator-or-higher user opens the dashboard and sees current KPIs (total users, active today, new signups, live postings, open reports), a 7-day activity chart they can switch between metrics, and which games currently have the most open parties.

**Why this priority**: The core "what's happening right now" value of a dashboard — without accurate, current numbers, nothing else here is trustworthy.

**Independent Test**: As a moderator-or-higher user, view the dashboard and confirm each KPI matches a direct database count; switch the chart's metric and confirm the 7-day bars update; confirm Top games reflects current open-posting counts by game.

**Acceptance Scenarios**:

1. **Given** a moderator-or-higher user, **When** they view the dashboard, **Then** each KPI card (total users, active today, new signups, live postings, open reports) shows a value matching a direct, current count.
2. **Given** the activity chart, **When** the user switches its metric (Signups / Active / Postings), **Then** the 7-day bars update to reflect that metric's daily values.
3. **Given** the Top games section, **When** it renders, **Then** it ranks games by their current count of open postings, most first.
4. **Given** a user without moderator-or-higher access, **When** they attempt to view the dashboard, **Then** they're denied per Error Pages' access-denied behavior.

---

### User Story 2 - Moderator sees what needs attention and recent activity (Priority: P2)

A moderator-or-higher user glances at Needs-attention counts (open reports by type) and a recent-activity feed to decide what to look at next.

**Why this priority**: A useful routing/orientation aid layered on top of the raw numbers (US1), but the dashboard is still meaningful without it — most value is in the KPIs/chart.

**Independent Test**: With open reports of different target types seeded, confirm each Needs-attention card shows an accurate count; with seeded AuditEntry rows, confirm the recent-activity feed lists them in order; with none seeded, confirm an empty state instead of a broken feed.

**Acceptance Scenarios**:

1. **Given** open reports of various target types, **When** the Needs-attention section renders, **Then** each card (User reports, Posting review, Forum review) shows an accurate current count, grouped from the existing `reports` table by `targetType`.
2. **Given** existing `AuditEntry` rows, **When** the recent-activity feed renders, **Then** it lists the most recent ones in order, each with its actor, action text, and a relative time.
3. **Given** no `AuditEntry` rows exist yet, **When** the feed renders, **Then** an empty state appears rather than a broken or blank section.

---

### Edge Cases

- What happens to "Active today"? → Redefined as the count of distinct users with a timestamped action today (a posting, application, forum post/reply, or message), derived from existing tables' `createdAt` columns — not a presence/last-seen system, consistent with every prior feature's rejection of building one.
- What happens to the admin sidebar's live queue-count badges? → The sidebar itself is Design System infrastructure (out of this feature's scope); this feature computes the underlying counts (same queries as the Needs-attention cards), and the shared shell reads them — not a separate mechanism this feature builds twice.
- What happens to `logAuditEntry()` before any other admin feature calls it? → The recent-activity feed is empty or sparse until Admin Users/Postings/Forum/News (all not yet spec'd) actually generate entries — this feature ships and tests the mechanism and its display, not a live end-to-end retrofit of features that don't exist yet.
- What happens to "auto-flagged" queue items `guidelines.md` mentions? → Out of this feature's scope — that's Admin Postings'/Admin Forum's own future moderation logic; this feature only counts existing `reports` rows by `targetType`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role ≥ moderator (reusing `require-role.ts`) to view this feature's content; a visitor without that access MUST be denied per Error Pages' access-denied behavior.
- **FR-002**: System MUST show five KPI cards — total users, active-today (per the redefined, timestamp-derived meaning), new signups today, live (open) postings, and open reports — each reflecting a current, direct count.
- **FR-003**: System MUST show a 7-day activity chart with a metric switcher (Signups / Active / Postings), each metric computed per day from existing tables' timestamps.
- **FR-004**: System MUST show a "Top games today" ranking of games by their current count of open postings.
- **FR-005**: System MUST show Needs-attention counts (User reports, Posting review, Forum review), each a count of open `reports` rows grouped by `targetType`, linking toward the corresponding (not-yet-built) admin queue page.
- **FR-006**: System MUST show a recent-activity feed reading from an `AuditEntry` table, most recent first, with an empty state when none exist.
- **FR-007**: System MUST provide a `logAuditEntry()` mechanism other admin features can call to record an entry — this feature does not itself retrofit any other feature to call it (none of the features that would generate real entries are spec'd yet).

### Key Entities

- **AuditEntry**: New entity this feature introduces (per `guidelines.md`'s documented shape) — `actorId`, `action`, `category` (`moderation` \| `content` \| `access` \| `system`), `targetType`, `targetId`, `targetLabel`, an optional `reason`, `meta` (a small JSON blob for details), `createdAt`. This feature reads it for the recent-activity feed and provides `logAuditEntry()`, but is not itself a significant writer yet.
- **Reports**: Read from Blocked Users' (`008-blocked-users`) existing table — grouped by `targetType`/`status` for both the Needs-attention cards and the "Open reports" KPI, no schema change.
- **User/Posting/Application/ForumThread/ForumReply/Message**: Read-only, for KPI/chart computation (counts and distinct-user activity) — no changes to any of them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of KPI values and chart data match a direct, current database count at the moment of viewing — never a stale or hardcoded snapshot.
- **SC-002**: 100% of Needs-attention counts accurately reflect currently-open `reports` rows for their respective `targetType`.
- **SC-003**: 100% of visitors without moderator-or-higher access are denied access, never shown dashboard content.
- **SC-004**: 100% of "Top games today" rankings reflect the current count of open postings per game.
- **SC-005**: The recent-activity feed never shows a broken/blank section when no `AuditEntry` rows exist — an explicit empty state instead.

## Assumptions

- The admin sidebar shell (nav items, badge placement, role/name footer) is Design System infrastructure, exempt from the per-feature gate (`docs/feature-list.md`) — this feature owns only the main content area. The sidebar's live badge counts read the same queries this feature defines for its own Needs-attention cards, not a duplicated mechanism.
- "Active today" is redefined as distinct users with any timestamped action today (posting, application, forum post/reply, message) — not a presence/last-seen system, consistent with Home's, Profile's, Forum index's, and Inbox's own prior rejections of building one.
- `logAuditEntry()` and the `AuditEntry` table ship ready and tested, but this feature doesn't retrofit any other (not-yet-spec'd) admin feature to call it — the recent-activity feed will be empty or sparse until Admin Users/Postings/Forum/News exist and start generating entries.
- Needs-attention counts and the "Open reports" KPI both reuse the existing `reports` table (Blocked Users, `008`), grouped by `targetType`/`status` — no separate auto-flag queue system is built here; that remains Admin Postings'/Admin Forum's own future scope.
- Role gating reuses Error Pages' (`002-error-pages`) `require-role.ts` — its second real consumer, after Content Page (`014`).
