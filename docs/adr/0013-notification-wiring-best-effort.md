# ADR 0013: Write actions persist notifications best-effort; host requests stay synthesized

**Status**: Accepted

**Date**: 2026-07-17

**Feature**: `040-notification-wiring`

## Context

Feature 012 built `createNotification()` and the notification feed/bell, but
deferred wiring any real caller (`docs/future-work.md` → "Wiring other features'
write actions to createNotification()"). In practice the stored-notifications
half of the feed has been empty in production — the `notifications` table's own
schema comment says "no other feature calls createNotification() yet."

The feed (`get-notifications.ts`) already merges two sources: stored
`notifications` rows **plus** live-synthesized "request" items computed directly
from the `applications` table for postings the viewer **hosts**. So a host
already sees inbound join-request activity (pending/accepted/declined) without any
stored notification. What produces nothing anywhere today: a forum reply (the
thread author is told nothing), an `@mention` (no mention handling exists at all),
and the **applicant** side of a request being resolved — declining is entirely
silent to the person who asked to join.

This feature wires three events. Two design tensions had to be resolved: (1) how
notification writes relate to the primary actions they hang off — especially
`accept-request.ts`, whose seat-accounting runs in a transaction; and (2) how the
new applicant-facing accept/decline notifications avoid duplicating the host's
existing live-synthesized view.

## Decision

1. **Finally wire `createNotification()` from write actions**, via a small
   server-only `notify-events.ts` module the four actions call: `post-reply.ts`
   (reply → thread author; mentions), `create-thread.ts` (mentions),
   `accept-request.ts` and `decline-request.ts` (→ applicant).

2. **Notification creation is strictly best-effort.** The emitters never throw;
   a failure is logged and swallowed. The primary action (reply saved, thread
   created, request accepted/declined) always succeeds and reports success even
   if the notification write fails, and a failure never rolls back or alters the
   primary action. For `accept-request.ts` the emitter runs **outside** the
   status/seat/conversation transaction, so a notification failure cannot corrupt
   capacity accounting (Constitution Principle V — validated transaction seam).

3. **Host-side party-request activity stays live-synthesized; only the applicant
   side is persisted.** The new `accepted`/`declined` notifications target the
   applicant (`userId = applicantId`, actor = host). The host's synthesized view
   (`postings.hostId === userId`) is untouched, which is what prevents any
   duplication. They fire only for **applicant-initiated** requests
   (`initiatedBy !== "host"`); the host-initiated-invite reversal is already
   covered by the host's synthesis plus the accept system-message, so it is not
   re-notified.

4. **Add a `declined` notification type.** `notifications.type` is a free-text
   column, so this is additive: the `NotificationType` union, the `categoryOf`
   filter bucket (→ "requests"), and the `TYPE_ICON` display map each gain a
   `declined` case. No schema migration.

5. **`@mention` parsing is a validated trust boundary.** Mention tokens are
   attacker-controlled free text, parsed with a strict grammar bound to the real
   handle format and resolved against real `users.handle` rows server-side;
   unknown handles are silently ignored (Constitution Principle II).

## Consequences

- The bell finally reflects forum activity and closes the silent-decline
  dead-end, without changing the feed/bell components beyond the `declined`
  display case.
- No migration, no new table, no new external dependency.
- Best-effort means a notification can be silently lost if its write fails — an
  accepted tradeoff: never endangering the primary action outweighs guaranteed
  delivery for an in-app, non-critical signal. (Guaranteed/queued delivery and
  email fan-out remain future work.)
- Retrofitting new DB writes into four already-tested actions ripples into their
  test files (as `logAuditEntry` did previously); each gains recipient/skip/dedupe
  coverage plus a "primary action survives a notification failure" assertion.

## Alternatives considered

- **Notify inside the accept transaction** — rejected: couples a non-critical
  side effect to seat-accounting atomicity; a notification failure would roll back
  a legitimate accept.
- **Emit accept/decline for everyone and filter by recipient** — rejected:
  in the host-initiated-invite flow the applicant is the actor, so it would
  notify the actor about their own action, and risks doubling the host's
  synthesized view.
- **Store mentions as a join table** — rejected: handles are unique/immutable, so
  transient resolution at write time needs no schema.
- **Also notify new DMs / all thread participants / news broadcasts** — out of
  scope (future-work): DMs already have the Messages nav badge (037); the others
  are separate fan-out designs.
