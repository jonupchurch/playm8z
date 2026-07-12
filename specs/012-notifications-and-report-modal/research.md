# Phase 0 Research: Notifications + Report modal

## 1. `createNotification()` ships with no callers wired up yet

**Decision**: build and unit-test `create-notification.ts` as a
standalone, reusable helper; demonstrate the UI against seeded/test
data rather than retrofitting Listing detail's apply flow, Inbox's
accept/decline, Forum Thread's reply/mention, or Inbox's send-message
to actually call it.

**Rationale**: matches the exact pattern already used for
`require-verified-email.ts` (Auth & Onboarding) and `require-role.ts`
(Error Pages) — build the mechanism, let consumers adopt it as their
own follow-up. Retrofitting four already-merged, already-working
features' write actions in this same pass would be a large, low-value
amendment surface for a notification system whose UI can be fully
built and tested without live triggers.

**Alternatives considered**: wiring all four now — rejected as scope
beyond what shipping the notification system itself requires; the
follow-up is logged (`docs/future-work.md`) so it isn't forgotten.

## 2. Reusing Inbox's accept/decline Server Actions directly

**Decision**: the Accept/Decline controls on a request notification
call `011-inbox-messaging`'s existing `accept-request.ts`/
`decline-request.ts` directly — no new Server Action, no duplicated
transaction logic.

**Rationale**: that transaction (Application → Posting → Conversation,
atomically) already exists and is already tested; a second
implementation would risk drifting from it and doubles the surface
area for the exact bug class Principle V singles out ("a seam with
real risk of silent breakage").

**Alternatives considered**: a parallel accept/decline implementation
scoped to notifications — rejected for the drift/duplication reason
above.

## 3. Report flow writes into Blocked Users' existing tables

**Decision**: `submit-report.ts` inserts into the existing `reports`
table (`008-blocked-users`) with a real `reason` value (this feature's
first actual populated reason, per that table's already-nullable
column) and, when "Also block" is checked, also inserts into the
existing `blocks` table — no schema changes to either.

**Rationale**: both tables already have exactly the shape needed;
this feature is simply a fuller-featured writer of the first and an
additional entry point into the second, consistent with the
established "extend, don't duplicate" pattern for shared entities.

**Alternatives considered**: a separate, richer report table for this
feature's own flow — rejected as duplication of an already-shared
entity.

## 4. Not retrofitting Blocked Users'/Forum Thread's existing report UI

**Decision**: this feature's canonical modal is available for any
*new* report entry point (Listing detail's newly-un-deferred Report
action uses it, per spec.md's FR-010) but doesn't replace Blocked
Users' "Also report" checkbox or Forum Thread's bare "Report" button —
both already work today with a minimal, reason-less report record.

**Rationale**: neither is broken; upgrading either is a UX consistency
improvement, not a correctness fix, and doesn't block this feature
from shipping — logged as optional polish (`docs/future-work.md`).

**Alternatives considered**: a mandatory sweep replacing both — rejected
as scope beyond this feature's own wireframe/spec, which only commits
to a *new*, reusable modal, not a retrofit of every existing report
entry point.
