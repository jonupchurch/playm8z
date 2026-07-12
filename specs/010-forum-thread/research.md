# Phase 0 Research: Forum Thread

## 1. Route shape: `/forum/thread/[id]`, not `/forum/[category]/[id]`

**Decision**: a flat `/forum/thread/[id]` route — category isn't part
of the URL.

**Rationale**: a thread's category is stored data the page reads and
displays, not identity — encoding it in the URL would mean either a
broken link or a confusing redirect if a moderator ever recategorizes
a thread (once Admin Forum exists). Matches Listing detail's
`/listing/[id]` precedent (also stores rather than URL-encodes its
category-adjacent fields).

**Alternatives considered**: `/forum/[category]/[id]`, matching the
wireframe's breadcrumb literally — rejected for the reason above; the
breadcrumb itself can still show the category as a link back to Forum
index pre-filtered to it, without it being part of this page's own URL.

## 2. Likes as a real per-user relationship

**Decision**: a `likes` table (`userId`, `targetType`, `targetId`)
with a database-level unique constraint on the triple, not just an
application-level "did this user already like this" check.

**Rationale**: a UI double-click or two near-simultaneous requests
could otherwise both pass an application-level check before either
insert lands — the same class of race a bare `SELECT`-then-`INSERT`
check can't fully close. A real unique constraint makes the database
itself the enforcement point, matching Principle II's spirit of not
trusting a check that can be raced.

**Alternatives considered**: an application-level "already liked" check
only — rejected for the race-condition reason above; a bare integer
counter with no per-user record — rejected, since it can't support
unlike or prevent double-counting at all (spec.md's FR-008 requires
both).

## 3. Reusing Blocked Users' `Report` entity

**Decision**: `report-forum-content.ts` inserts into the existing
`reports` table (`008-blocked-users`) with `targetType = 'forum'` —
no new report table or shape.

**Rationale**: `reports` already exists with exactly the shape needed
(`reporterId`, `targetType`, `targetId`, `reason`, `status`,
`createdAt`); this feature is simply its second writer, same pattern
already established once.

**Alternatives considered**: a forum-specific report table — rejected
as duplication of an already-shared entity for no real behavioral
difference.

## 4. Dropping `isBestAnswer`

**Decision**: `forumReplies` has no `isBestAnswer` column.

**Rationale**: no control anywhere in the wireframe sets it (unlike
"Top" sort, which is a real, working mechanism driven by like counts);
the "TOP REPLY" badge shown on one hardcoded sample reply was simply
demo flavor, the same category of finding as Blocked Users' fake
per-block "reason" chips.

**Alternatives considered**: building a real "mark as best answer"
control for the thread's original poster — rejected as scope beyond
what this feature's own wireframe actually depicts; revisit if a future
iteration wants genuine Q&A-style best-answer marking.

## 5. Subscribe stores a preference only

**Decision**: `threadSubscriptions` is written to and read from by
this feature, but nothing currently sends a notification because of
it — no notification-delivery mechanism exists yet.

**Rationale**: matches the platform's already-decided narrow
notification scope (only registration/verification email is wired up;
every other notification type stays in-app-only, not yet built) —
consistent with not inventing a parallel one-off delivery mechanism
just for thread subscriptions.

**Alternatives considered**: building a simple polling/in-app
notification for subscribed threads now — rejected as scope beyond
this feature's own wireframe, which shows no notification UI at all,
only the Subscribe toggle itself.
