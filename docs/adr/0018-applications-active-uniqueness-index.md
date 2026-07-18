# ADR 0018: Prevent duplicate active applications with a partial unique index

**Status**: Accepted

**Date**: 2026-07-18

**Feature**: `046-applications-unique-active`

**Supersedes**: the `applications` schema comment (`src/db/schema.ts` ~lines 269-272) that documented
enforcing a unique active application "at the Server Action level … not a DB constraint, since Drizzle's
partial-unique-index support varies and the check is cheap in code."

## Context

A unique *active* application per `(postingId, applicantId)` was enforced only in application code:
`apply-to-posting.ts` and `invite-to-party.ts` each independently run a select-then-insert ("is there a
pending/accepted row for this pair?") with no transaction and no DB constraint. Two near-simultaneous
requests — a double-submitted apply, or an apply landing at the same instant a host invite does — can both
pass the check before either INSERT commits, creating two active application rows for one pair. Because
accepting an application decrements seats and builds a roster, a duplicate active application can corrupt the
seat/roster accounting the accept transaction is otherwise careful to protect. The original "no constraint"
call cited Drizzle's variable partial-index support; 043 has since shown how to declare and ship a non-plain
index safely, so that rationale no longer holds.

## Decision

1. **A partial unique index enforces the guarantee**: `UNIQUE (postingId, applicantId) WHERE status IN
   ('pending','accepted')`. At most one active application per pair, no matter which path writes it or how
   concurrently. Terminal states (declined/withdrawn) are outside the predicate, so re-application after them
   stays allowed — the predicate matches the existing app-side checks exactly.

2. **Existing active duplicates are collapsed once, first.** `dedupeActiveApplications()` keeps `accepted` over
   `pending` (an accepted row backs a real seat), tie-broken by oldest then id, and is idempotent. Run local
   then prod before the index is created (it can't be created while active duplicates exist).

3. **Both writers stay conflict-safe.** Each keeps its app-side select-check (fast path + friendly message) and
   inserts with `ON CONFLICT DO NOTHING … RETURNING`; an empty return means a concurrent writer won the race →
   the same existing "already has an active application" rejection, never a raw error. App-side dedup is
   retained as defense-in-depth (mirrors 043).

4. **The index is schema-declared.** Verified empirically: `drizzle-kit push` round-trips this partial index
   cleanly and leaves it alone on deploy — unlike 043's *expression* index, which push re-drops/creates every
   deploy. (If a future drizzle-kit version ever churns it, schema-declared is still safe: push would
   *recreate* it, not drop-and-forget as SQL-managing would, and both writers dedup app-side so a recreate
   couldn't hit a duplicate.) It is NOT SQL-managed. Production DDL is applied by hand before merge so the
   deploy push is a verified no-op for this index.

## Consequences

- The seat/roster accounting can no longer be corrupted by a duplicate active application, even under a race —
  the one state the accept transaction couldn't defend on its own.
- One guarantee, one place; the app-side check remains the clean UX and the DB index the race-proof backstop.
- The dedup removes an extra row but does not re-derive seat counts; if it ever deleted a genuinely-accepted
  duplicate, a seat could need manual reconciliation — logged to future-work, vanishingly unlikely at current
  scale (the dedup is expected to find nothing).
- No deploy churn: drizzle-kit push round-trips this partial index cleanly (verified), a better outcome than
  043's expression index (which still drops/recreates every deploy).

## Alternatives considered

- **Full unique on (postingId, applicantId)** — rejected: would block legitimate re-application after a
  decline/withdraw.
- **Serializable transaction around each writer, no constraint** — rejected: heavier, and still can't be
  race-proof across two independent code paths without a shared constraint.
- **Catch `23505` instead of `onConflictDoNothing().returning()`** — rejected: makes the race path
  error-driven; the returning-empty check is cleaner (no error introspection). (`err.cause.code` if ever needed.)
- **SQL-manage the index (keep it out of the schema)** — rejected: `drizzle-kit push` would drop an index it
  doesn't know about on every deploy.
- **Keep app-side-only enforcement** — rejected: it's exactly what leaves the TOCTOU race open.
