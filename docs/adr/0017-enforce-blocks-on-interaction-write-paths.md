# ADR 0017: Enforce blocks on all party/listing interaction write paths

**Status**: Accepted

**Date**: 2026-07-18

**Feature**: `045-enforce-blocks`

## Context

Blocking is meant to stop someone from interacting with you. The bidirectional active-block check
`hasActiveBlockBetween(a, b)` (`src/lib/inbox/search-contacts.ts`) enforces that for direct messages
(`start-conversation.ts`) and notifications (`notify-events.ts`, 040) — but it was never added to the
party/listing interaction write paths. So a blocked user could still apply to your listing, ask a
question on it, be invited to your party, or be accepted onto your roster. The `blocks` table's own
comment (`schema.ts`) says these surfaces "should query active blocks in both directions"; only
messaging and notifications did. This is the same class of gap as the 040 notification-wiring gap — a
shared cross-cutting guard not retrofitted to every write path.

## Decision

1. **Block enforcement is a cross-cutting invariant on user-to-user interaction write paths.** Every
   server action where one player initiates contact/association with another must gate on
   `hasActiveBlockBetween` before the write.

2. **`hasActiveBlockBetween` is the single guard, called directly at each site.** No second
   block-checking mechanism, no change to the helper's semantics or the `blocks` table, and no generic
   middleware/decorator — a direct call per site, matching `start-conversation.ts`, so each path keeps
   its own neutral message.

3. **Covered now (the party/listing interaction paths):** `apply-to-posting` (applicant↔host),
   `ask-question` (asker↔host — the action now also loads the posting for the host id + an existence
   guard), `invite-to-party` (host↔invited), `accept-request` (applicant↔host, checked inside the
   existing transaction so a block rolls the whole accept back).

4. **Bidirectional.** An active block in either direction refuses the interaction (blocks are stored
   directionally but enforced symmetrically), consistent with messaging.

5. **Fail-closed, gracefully.** If the block lookup can't answer, the interaction is refused, never
   allowed, and surfaces as a graceful `{ success:false }` (or a transaction rollback for accept) — not
   an unhandled 500. The three paths without existing error handling wrap the check to return a generic
   "try again" failure on error, distinct from the neutral block message.

6. **Neutral, non-leaking refusals.** Messages ("You can't apply to this listing.", etc.) never disclose
   that a block exists or its direction.

7. **Deferred (separate decisions, logged to future-work):** following (public profile) and report
   submission — a report is a safety valve one may need *because* of a block, and follow is a distinct
   interaction; and the Forum write paths, a separate surface.

## Consequences

- A block now actually blocks, on every party/listing surface where two players connect — the guarantee
  the block flow already promised.
- One guard, reused; a future interaction write path is expected to call it too (the invariant is now
  explicit, so the next path is less likely to forget — the same lesson as 044's purge helper).
- No schema change, no migration, no data backfill; ships as a normal code merge.
- Block-vs-follow and block-vs-report remain deliberately unresolved, tracked in future-work.

## Alternatives considered

- **A generic block-check middleware/decorator** — rejected: over-abstraction; the spec and this ADR
  favor a direct call per site (each path's neutral message and placement differ).
- **Thread the transaction into a new helper overload for `accept-request`** — rejected: widens the change
  to the shared helper and the messaging path for no correctness gain; `blocks` isn't written in the txn,
  so a pooled read is correct and the throw still rolls back atomically.
- **One-directional check (only "did the acting user get blocked")** — rejected: a block must stop contact
  regardless of who blocked whom; symmetric matches messaging.
- **Fail-open on lookup error** — rejected: a block guard that allows on error defeats its purpose.
