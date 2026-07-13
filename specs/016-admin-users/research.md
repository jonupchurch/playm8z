# Phase 0 Research: Admin Users

## 1. Ban-only, no separate Delete — direct precedent reuse

**Decision**: no "Delete user" action exists at all; Ban is the single
severe account action, exactly matching Profile's (`007`) already-
made Deactivate-vs-Delete resolution.

**Rationale**: the underlying question ("should there be a 'more
final than the reversible one' action, given ADR 0005 makes true
deletion impossible?") is identical to one the user already answered
directly — reusing that answer here isn't a new open question, just
consistent application.

**Alternatives considered**: none seriously — re-litigating an already-
decided question for a second, structurally identical case would be
inconsistent without a stated reason to treat this case differently.

## 2. Small, bounded amendments to make removal actually hide content

**Decision**: add `removedAt` to `postings` and `forumThreads`, and
make a single-line addition (`AND removedAt IS NULL`, or the Drizzle
equivalent) to Home's `get-open-postings.ts`, Browse's
`search-postings.ts`, and Forum index's `search-threads.ts` — all
already-merged, already-working query functions.

**Rationale**: a "Remove" action with no visible effect on public
surfaces would ship a no-op moderation control — the same reasoning
that made Blocked Users' "Also report" checkbox need a real write
(rather than being purely decorative). Unlike larger amendments (the
`SavedListing`/`Report` cases), this is a single condition added to an
existing `WHERE` clause in each function — proportionate to add
directly as tasks in this feature rather than reopening those three
features' own spec/plan documents.

**Alternatives considered**: leaving those queries unchanged and
treating "hiding removed content" as a documented future follow-up
(the Blocked-Users-enforcement pattern) — rejected here specifically
because a moderation "Remove" button that visibly does nothing is a
qualitatively worse gap than "a relationship exists but isn't yet
consulted everywhere" (Blocked Users' case, where blocking still does
something real — hide it from the *blocker's own* view isn't
promised by that feature). Here, "Remove" implies removal from public
view as its entire point.

## 3. "Flagged" is computed, not stored

**Decision**: a user displays as "flagged" when they have at least one
currently-open `reports` row (`targetType = user`) and aren't banned;
there's no `flagged` column and no admin action to set/clear it
directly.

**Rationale**: same reasoning already applied to Error Pages' "HOT"
badge (computed from activity) vs. "PINNED" (a real stored,
deliberately-set field) — "flagged" here is naturally a read of
existing report data, not a decision an admin makes independently of
those reports; keeping it computed means it can never drift out of
sync with the reports that supposedly caused it.

**Alternatives considered**: a stored `flagged` boolean an admin
toggles directly — rejected, would require the admin to remember to
flag/unflag in lockstep with reports being opened/resolved, an
avoidable synchronization burden for data that's already fully
determined by existing rows.

## 4. Search/filter follows Browse's/Forum index's server-side pattern

**Decision**: `search-admin-users.ts` takes validated `searchParams`
(query text, status filter) and runs a real, paginated-if-needed
query — the same architecture already used for any list that can grow
without bound.

**Rationale**: identical scaling reasoning already established twice;
no new pattern needed.

**Alternatives considered**: none new.
