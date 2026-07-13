# Phase 0 Research: Admin Dashboard

## 1. "Active today" without a presence system

**Decision**: "Active today" and the chart's "Active" metric both
count *distinct users* who have any row with `createdAt` (or
equivalent) falling today across `postings`, `applications`,
`forumThreads`, `forumReplies`, and `messages` — a `UNION` of user IDs
from each, counted distinctly, not a dedicated last-seen/presence
column.

**Rationale**: every prior feature that touched an "online"/"active"
concept (Home, Profile, Forum index, Inbox) rejected building real
presence tracking; this is the same call applied to a dashboard KPI
instead of a UI badge — a meaningfully real number without new
infrastructure.

**Alternatives considered**: a `lastActiveAt` column on `user` updated
on every authenticated request — rejected, exactly the presence-
tracking infrastructure this project has consistently avoided; a
session-count-based metric — rejected, requires a session-analytics
system this project doesn't have either.

## 2. Needs-attention and "Open reports" reuse the existing `reports` table

**Decision**: both are `COUNT(*) ... GROUP BY targetType WHERE status
= 'open'` queries against Blocked Users' (`008`) existing `reports`
table — no new auto-flag or moderation-queue table.

**Rationale**: `guidelines.md`'s mention of "auto-flags" creating
pre-flagged queue items without a user report describes a future
moderation *feature's* own logic (Admin Postings/Admin Forum), not
something this dashboard needs to build to show a count — those
future features can insert their own `reports` rows (or extend the
table) when they're built; this feature only needs to count whatever
already exists.

**Alternatives considered**: a dedicated `ModerationQueueItem` entity
unifying reports and auto-flags now — rejected as speculative
structure for a system (auto-flagging) that isn't spec'd yet.

## 3. `AuditEntry`/`logAuditEntry()` ships with no real callers

**Decision**: build and unit-test `log-audit-entry.ts` and the
`auditEntries` table fully; demonstrate the recent-activity feed
against seeded rows. No other feature is amended to call it.

**Rationale**: unlike `createNotification()` (whose potential callers
are already-merged, working features), the admin features that would
generate real `AuditEntry` rows (Admin Users, Admin Postings, Admin
Forum, Admin News) aren't spec'd yet — there's nothing to retrofit.
This is the cleanest version of the "define now, adopt later" pattern
this project has used repeatedly.

**Alternatives considered**: none — there's no earlier-feature
amendment surface to weigh here, unlike the Notifications case.

## 4. Top games reuses the established aggregate pattern

**Decision**: `get-top-games.ts` is the same `GROUP BY game, COUNT(*)
WHERE status = 'open'` shape Home's Trending row and Browse's Game
facet already use — ranked, top 5.

**Rationale**: identical underlying question ("which games have the
most open postings right now"), so no reason to invent a fourth way to
ask it.

**Alternatives considered**: none — directly reuses existing,
already-justified precedent.
