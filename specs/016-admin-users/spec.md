# Feature Specification: Admin Users

**Feature Branch**: `016-admin-users`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Admin Users feature for playm8z: user management at `/admin/users`. Source of truth: resources/wireframes/admin/playm8z - Admin Users.dc.html. Stats (total/active/flagged/banned), a searchable/filterable table (avatar+handle, email, region, content counts, status), row actions (View drawer, Ban/Unban, Delete), and a detail drawer (summary, joined/region/report count, Ban/Message/Delete, Postings/Forum-posts tabs with per-item Remove). Gated on role >= moderator (Error Pages' require-role.ts, third real consumer). The wireframe's 'Delete' user action literally removes the row from the list -- this directly violates ADR 0005 (no hard deletes, ever) and is dropped as a distinct action, collapsed into Ban, the exact same resolution the user already made for Profile's own Deactivate-vs-Delete question (007) -- Ban is the one severe 'this account can't use the platform' action; there's no second, more-final one. 'Flagged' status is not a separately-set admin action -- it's computed (open reports against the user, and not banned), reusing the existing reports table (Blocked Users, 008) rather than a third manually-toggled status value; only 'active' (the default) and 'banned' (an admin-set bannedAt timestamp) are real stored states. Per-item 'Remove' on a user's postings/forum posts extends Posting and ForumThread with a new removedAt (nullable) moderation-hide field -- ADR-0005-consistent (never a real delete) -- and this feature includes small, bounded follow-up amendments to Home/Browse's and Forum index's existing read queries to exclude removed rows, since a moderation-remove action with no actual hiding effect would be a no-op worth shipping."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Moderator views, searches, and filters the user list (Priority: P1)

A moderator-or-higher user sees accurate stats (total/active/flagged/banned), searches by name/handle/email, and filters by status.

**Why this priority**: The baseline "who's on this platform and how are they doing" view — everything else here (banning, removing content) starts from finding the right user first.

**Independent Test**: With users across each status seeded, confirm the stats cards match direct counts, search narrows correctly, and each status filter shows only matching users.

**Acceptance Scenarios**:

1. **Given** users across each status, **When** a moderator-or-higher user views this page, **Then** the four stats cards (total, active, flagged, banned) each show an accurate current count.
2. **Given** the user table, **When** the moderator searches by name, handle, or email, **Then** it narrows to matches; selecting a status filter narrows further (combined with search).
3. **Given** a user row, **When** it renders, **Then** it shows accurate postings and forum-thread counts for that user.
4. **Given** a visitor without moderator-or-higher access, **When** they attempt to view this page, **Then** they're denied per Error Pages' access-denied behavior.

---

### User Story 2 - Moderator bans or unbans a user (Priority: P2)

A moderator-or-higher user bans a problem account (or unbans a previously-banned one) from the table row or the detail drawer.

**Why this priority**: The real enforcement action this page exists for, but exercised far less often than simply reviewing the list (US1).

**Independent Test**: Ban an active user from the table, confirm their status becomes banned and the stats update; unban them, confirm status reverts; repeat from within the detail drawer.

**Acceptance Scenarios**:

1. **Given** an active (non-banned) user, **When** a moderator-or-higher user selects Ban (from the row or the drawer), **Then** the user's status becomes banned immediately, reflected in the table, drawer, and stats.
2. **Given** a banned user, **When** a moderator-or-higher user selects Unban, **Then** their status reverts to active (or flagged, if they still have open reports against them).
3. **Given** any user, **When** the drawer opens, **Then** it shows their join date, region, and current open-report count.

---

### User Story 3 - Moderator reviews and removes a user's content (Priority: P3)

A moderator-or-higher user opens a user's detail drawer, reviews their postings and forum threads, and removes an individual item.

**Why this priority**: A targeted content-moderation action, but less frequently needed than reviewing the list (US1) or banning (US2) — most drawer visits are just for context, not removal.

**Independent Test**: Open a user's drawer, switch between the Postings and Forum posts tabs, confirm accurate listings (or an empty state), remove one item, and confirm it no longer appears there or on its normal public surface (Home/Browse for a posting, Forum index for a thread).

**Acceptance Scenarios**:

1. **Given** a user's drawer, **When** the moderator switches between the Postings and Forum posts tabs, **Then** each shows that user's own content, or an empty state if they have none.
2. **Given** a listed posting or forum thread in the drawer, **When** the moderator selects Remove, **Then** it's marked removed (not deleted, ADR 0005) and no longer appears in the drawer, on Home/Browse (for a posting), or on Forum index (for a thread).
3. **Given** a removed posting or thread, **When** referenced by an existing direct link (e.g., Listing detail, Forum Thread), **Then** this feature does not change how those pages themselves handle a removed target — that's each of those pages' own concern, out of scope here.

---

### Edge Cases

- What happens to the wireframe's "Delete" user action? → Dropped as a distinct action, collapsed into Ban — the exact resolution already made for Profile's Deactivate-vs-Delete question; there's no second, more-final removal action, consistent with ADR 0005.
- What happens to "Flagged" status? → Not a separate stored value an admin sets — it's computed from whether the user currently has any open `reports` rows (`targetType = user`) and isn't banned. Only `active` and `banned` are real, admin-controlled states.
- What happens to a banned user's existing content? → Out of this feature's own scope to auto-remove; banning and content-removal are separate, deliberate actions a moderator takes independently.
- What happens to search/filter combined with no matches? → An empty state ("No users match your search") instead of a blank table.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role ≥ moderator (`require-role.ts`) to view or act on this page; a visitor without that access MUST be denied.
- **FR-002**: System MUST show four stats cards (total, active, flagged, banned users), each an accurate current count.
- **FR-003**: System MUST show a searchable (name/handle/email) and status-filterable table of users, each row showing identity, email, region, postings/forum-thread counts, and computed status.
- **FR-004**: "Flagged" status MUST be computed (an unbanned user with at least one currently-open `reports` row where `targetType = user`), not a separately-set value.
- **FR-005**: System MUST let a moderator-or-higher user ban an active/flagged user (from the row or the drawer), setting a `bannedAt` timestamp; System MUST let them unban a banned user, clearing it.
- **FR-006**: System MUST NOT offer a "Delete" action distinct from Ban — banning is the only severe account action this feature offers (see Assumptions).
- **FR-007**: System MUST show a per-user detail drawer with their join date, region, current open-report count, and tabs listing their postings and forum threads.
- **FR-008**: System MUST let a moderator-or-higher user remove an individual posting or forum thread from within the drawer, setting a `removedAt` timestamp (never a hard delete, ADR 0005) rather than removing the row.
- **FR-009**: Removed postings/forum threads MUST no longer appear on Home/Browse (postings) or Forum index (threads) — this feature includes the small, bounded query amendments those already-merged features need to exclude `removedAt`-set rows.
- **FR-010**: A search/filter combination matching no users MUST show an empty state, never a blank table.

### Key Entities

- **User**: Extended with `bannedAt` (nullable timestamp) — the only new admin-controlled account-status field this feature adds. "Flagged" is computed, not stored.
- **Posting**: Extended with `removedAt` (nullable timestamp) — a moderation-hide flag, read (and newly excluded) by Home (`003`) and Browse (`004`).
- **ForumThread**: Extended with `removedAt` (nullable timestamp) — same pattern, read (and newly excluded) by Forum index (`009`).
- **Reports**: Read from Blocked Users' (`008-blocked-users`) existing table, filtered to `targetType = user` and `status = open`, to compute "flagged" and the drawer's report count — no schema change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of stats-card counts and table rows reflect accurate, current data.
- **SC-002**: 100% of ban/unban actions immediately update that user's status everywhere it's shown (table, drawer, stats).
- **SC-003**: 100% of content-removal actions immediately hide that item from Home/Browse or Forum index, without deleting the underlying row.
- **SC-004**: 100% of visitors without moderator-or-higher access are denied, never shown this page's content.
- **SC-005**: 0% of "Flagged" statuses require a separate manual admin action to set or clear — it's always derived from current open reports.

## Assumptions

- The admin sidebar shell is Design System infrastructure, out of this feature's own scope, same as Admin Dashboard (`015`).
- Dropping "Delete" in favor of Ban-only is a direct application of the exact decision already made for Profile's (`007`) Deactivate-vs-Delete question — not a new open question requiring separate confirmation.
- "Flagged" is fully computed from the existing `reports` table, never a stored, manually-toggled value — consistent with how this project has repeatedly preferred deriving a status from existing data over inventing a new one (e.g., Error Pages' computed "HOT" vs. stored "PINNED").
- Content removal (`removedAt` on `Posting`/`ForumThread`) requires this feature to make small, bounded amendments to Home's/Browse's/Forum index's existing read queries (adding a `removedAt IS NULL` condition) — tracked as tasks within this feature rather than full spec rewrites of those already-merged features, since the change is a single added query condition, not a change to their own requirements.
- Removing a posting/thread doesn't cascade to how Listing detail or Forum Thread individually handle a now-removed target if directly linked — that's each of those pages' own future concern, not solved here.
- Banning a user doesn't automatically remove their existing content — the two are independent moderator actions.
