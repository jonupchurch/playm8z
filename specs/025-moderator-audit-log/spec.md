# Feature Specification: Moderator audit log

**Feature Branch**: `025-moderator-audit-log`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Moderator audit log at `/admin/audit-log`. Source of truth: resources/wireframes/admin/playm8z - Admin Audit Log.dc.html and docs/feature-list.md item 25. Search (actor/action/target) + actor filter + category filter (All/Moderation/Content/Access/System), day-grouped (Today/Yesterday/Earlier) expandable entries (actor, action, target, category badge, time, expand for a reason + structured meta key/value rows), CSV export, empty state. Gated on role >= moderator (a read-only transparency tool for the whole moderation team, not a mutation surface -- unlike Admin Settings' admin-only gate).

This feature is the final real consumer of Admin Dashboard's (015) `auditEntries` table/`logAuditEntry()` mechanism -- every writer introduced across the whole admin-suite marathon (016 through 024) now has somewhere real to be reviewed in full, paginated, filterable detail (015's own dashboard feed only ever showed a short recent-activity preview).

Reconciliations against already-established decisions:
- The wireframe's per-entry colored category badge shows 11 distinct values (Removal/Ban/Warning/Lock/Publish/Role/Dismiss/Edit/System/Approve/Settings) -- finer-grained than `auditEntries.category`'s actual 4-value enum (`moderation`|`content`|`access`|`system`, from 015). Deriving an 11-way classifier from free-text `action` strings would mean building a fragile keyword-matching classifier for purely cosmetic variety, the same category of fabricated-precision this project has repeatedly declined (e.g. dropped 'level', dropped non-canonical reason-flavor labels). The badge instead shows the real, stored `category` value, capitalized (Moderation/Content/Access/System) -- four colors, not eleven, matching what's actually structured data.
- The wireframe's 'IP: 2a01:...:9f (hashed)' meta example is dropped entirely -- no feature anywhere in this project captures or hashes IP addresses; adding real IP capture now would be new, privacy-sensitive data collection this feature was never asked to introduce, well beyond 'display an existing audit trail.'
- REAL GAP FOUND AND FIXED (the second one found in this session, after Public Profile's in Admin Settings, 024): Admin News (020) and Admin Content Pages (021) -- the wireframe's own seed data explicitly includes 'published news'/'edited content page' entries under the `content` category -- never actually wired `logAuditEntry()` despite `015`'s own spec explicitly anticipating 'Admin Users/Postings/Forum/News' (and, by the same logic, Content Pages) as its real callers. Small, bounded retroactive amendments: `020`'s `save-news-post.ts` (publish/schedule/update actions) and `021`'s `create-content-page.ts`/`toggle-page-status.ts`/`delete-content-page.ts` now each call `logAuditEntry()` (`category = 'content'`), the same closing-the-loop pattern already used twice before (Admin Forum fixing Admin Users' missing calls; this feature fixing Admin News'/Admin Content Pages').
- The audit log accumulates indefinitely (every admin/moderator action, forever, ADR-0005-consistent append-only) -- uses the established server-side, `searchParams`-driven search/filter/pagination pattern (Browse's/Forum index's/Admin Reports' precedent), day-grouped into Today/Yesterday/Earlier (the same bucketing convention already used by Notifications' Today/Earlier grouping, extended with one more bucket since this log is expected to be browsed further back).
- CSV export produces exactly the currently-filtered result set (search + actor + category), not the full unfiltered table -- what's on screen is what exports.
- This page is gated at moderator (not admin) -- unlike Admin Settings (024), this is a read-only transparency/accountability tool for the whole moderation team, not a mutation surface; there's no equivalent sensitivity to restricting who can read 'who did what and why.'
- This feature is read-only with respect to `auditEntries` itself -- it never writes a new entry for the act of viewing the log (that would be a pointless, infinitely-recursive audit trail)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Moderator browses, searches, and filters the audit log (Priority: P1)

A moderator-or-higher user browses every admin/moderation action ever taken, grouped by day, and narrows it by free-text search, actor, or category.

**Why this priority**: The baseline "what happened, who did it" transparency this feature exists for — everything else (expanding detail, exporting) follows from finding the right entries first.

**Independent Test**: With audit entries seeded across all four categories and multiple actors (including a system-generated one), confirm search/actor/category filters each narrow correctly (in combination), entries group correctly into Today/Yesterday/Earlier, and the category badge shows the real 4-value category, not a fabricated finer one.

**Acceptance Scenarios**:

1. **Given** audit entries across categories/actors/days, **When** a moderator-or-higher user visits this page, **Then** entries are grouped by day (Today/Yesterday/Earlier) and show actor, action, target, a real-category badge, and time.
2. **Given** the log, **When** the moderator searches free text (matching actor/action/target/reason), **Then** it narrows to matches; selecting an actor or category filter narrows further, combined with search.
3. **Given** an entry whose `actorId` is null, **When** it renders, **Then** its actor shows as "System."
4. **Given** a visitor without moderator-or-higher access, **When** they attempt to view this page, **Then** they're denied per Error Pages' access-denied behavior.
5. **Given** a search/filter combination with no matches, **When** it renders, **Then** an empty state ("No log entries match those filters") appears instead of a blank list.

---

### User Story 2 - Moderator expands an entry for full detail and exports the current view (Priority: P2)

A moderator expands a log entry to see its reason and structured meta detail, and exports the currently-filtered result set as CSV.

**Why this priority**: Deeper investigation and record-keeping needs, exercised less often than the baseline browse/search (US1).

**Independent Test**: Expand an entry with a reason and meta rows, confirm both display; export with an active filter applied, confirm the downloaded CSV contains only the filtered rows.

**Acceptance Scenarios**:

1. **Given** a collapsed entry, **When** the moderator selects it, **Then** it expands to show its reason (if any) and every meta key/value pair recorded at write time; selecting it again collapses it.
2. **Given** an active search/actor/category filter, **When** the moderator selects "Export CSV," **Then** the downloaded file contains exactly the currently-filtered/matching entries, not the full unfiltered table.

---

### User Story 3 - Every admin/moderation action across the whole suite appears here (Priority: P3)

Actions taken via Admin Users/Postings/Forum/Reports/News/Content Pages/Settings all appear in this log with an accurate category, closing a real gap where News/Content Pages never logged anything.

**Why this priority**: Completeness of the audit trail matters, but it's a background correctness property rather than a feature the moderator directly interacts with — hence lowest priority, though the retroactive fix itself is what makes US1/US2 meaningful in practice.

**Independent Test**: Publish a post via Admin News and edit a page via Admin Content Pages; confirm both now produce a `content`-category audit entry, visible in this log.

**Acceptance Scenarios**:

1. **Given** an admin publishes, schedules, or updates a post via Admin News (`020`), **When** it completes, **Then** a `content`-category audit entry is recorded and visible here.
2. **Given** an admin creates, publishes/unpublishes, or deletes a page via Admin Content Pages (`021`), **When** it completes, **Then** a `content`-category audit entry is recorded and visible here.
3. **Given** any already-wired writer (Admin Users/Postings/Forum/Reports/Settings, `016`-`019`, `024`), **When** its actions occur, **Then** they continue to appear here exactly as before — this feature adds no new writer of its own beyond the two bounded fixes above.

### Edge Cases

- What happens to the wireframe's 11-way category badge coloring? → Simplified to the real, stored 4-value `category`, capitalized (see Input) — no fabricated finer classification.
- What happens to the wireframe's hashed-IP meta example? → Dropped; no IP capture exists or is added by this feature.
- What happens to entries older than "Yesterday"? → Grouped into an "Earlier" bucket (this log is expected to be browsed further back than Notifications' own Today/Earlier grouping needed).
- What happens when viewing this page? → No new audit entry is written for the view itself — an infinitely-recursive log would be pointless.
- What happens to News/Content Pages actions that occurred before this feature's own retroactive fix ships? → Not backfilled — the log is honest about only recording what happened after each writer existed, the same "this feature doesn't retrofit history" stance every prior `logAuditEntry()`-adoption gap-fix has taken.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role ≥ moderator (`require-role.ts`) to view this page; a visitor without that access MUST be denied.
- **FR-002**: System MUST show every `auditEntries` row, grouped by day (Today/Yesterday/Earlier), each showing actor (or "System" when `actorId` is null), action, target, a category badge (the real, stored 4-value `category`), and time.
- **FR-003**: System MUST support free-text search (matching actor/action/target/reason) combined with an actor filter and a category filter (All/Moderation/Content/Access/System).
- **FR-004**: Selecting an entry MUST expand it to show its `reason` (if any) and every `meta` key/value pair; selecting it again MUST collapse it.
- **FR-005**: "Export CSV" MUST produce exactly the currently-filtered/matching result set.
- **FR-006**: A search/filter combination matching no entries MUST show an empty state, never a blank list.
- **FR-007**: This feature MUST add small, bounded retroactive amendments so Admin News' (`020`) publish/schedule/update actions and Admin Content Pages' (`021`) create/publish-unpublish/delete actions each call `logAuditEntry()` (`category = 'content'`) — closing a real gap those two features left since merging.
- **FR-008**: This feature MUST NOT write a new audit entry for the act of viewing or filtering the log itself.

### Key Entities

- **AuditEntry**: Reused from Admin Dashboard (`015`) — this feature is its first full, dedicated, filterable/paginated viewer (the dashboard's own feed only ever showed a short recent preview). No schema change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of audit entries (across every already-wired writer, plus the two newly-fixed ones) are visible and accurately grouped/filterable here.
- **SC-002**: 100% of search/actor/category filter combinations narrow correctly.
- **SC-003**: 100% of CSV exports contain exactly the currently-filtered result set, never more or less.
- **SC-004**: 100% of visitors without moderator-or-higher access are denied, never shown this page's content.
- **SC-005**: 0% of page views themselves generate a new audit entry.

## Assumptions

- The admin sidebar shell is Design System infrastructure, out of this feature's own scope, same as every prior admin feature. The sidebar's "owner" role label is demo flavor text, not a ratified distinct role, same normalization as prior admin features.
- This log is not backfilled for actions that occurred before a given feature's own `logAuditEntry()` wiring existed (including the two retroactive fixes this feature itself introduces) — it only ever reflects what actually happened once each writer was live.
- The audit log accumulates indefinitely — uses the established server-side `searchParams`-driven search/filter/pagination pattern (Browse's/Forum index's/Admin Reports' precedent), not a fetch-all approach.
- Gating this page at moderator (not admin) is a deliberate difference from Admin Settings (`024`) — this is a read-only transparency tool for the whole moderation team, not a mutation surface.
