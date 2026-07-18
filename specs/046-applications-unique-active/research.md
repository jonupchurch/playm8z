# Research: Prevent duplicate active applications

Phase 0 decisions. Shape closely mirrors 043.

## 1. Uniqueness mechanism: a partial unique index over active applications

**Decision**: `CREATE UNIQUE INDEX "applications_active_uniq" ON "applications" ("postingId", "applicantId")
WHERE status IN ('pending','accepted')`. Exactly one active application per pair; terminal states
(declined/withdrawn) are outside the predicate, so re-application after them is allowed.

**Rationale**: The predicate matches both existing app-side checks (`status IN (pending,accepted)`) so the
data-layer guarantee and the code agree. A *full* unique on (postingId, applicantId) would wrongly block
re-application after a decline/withdraw. This is the guarantee no app-side select-then-insert can provide
under concurrency.

**Alternatives**: full unique on the pair (rejected — blocks legitimate re-application); a status-less
composite (rejected — same); wrap both writers in a serializable transaction (rejected — heavier, still needs
the constraint to be race-proof across two independent code paths).

## 2. drizzle-kit push idempotency for the partial index — gated, schema-declared (per 043)

**Decision**: Declare it in `src/db/schema.ts` via Drizzle's `uniqueIndex("applications_active_uniq")
.on(applications.postingId, applications.applicantId).where(sql\`status IN ('pending','accepted')\`)`, gated by
the same local double-push idempotency check 043 used. 043 established empirically that drizzle-kit can't
round-trip a non-plain index (it re-drops/creates every deploy) and that **schema-declared is safer than
SQL-managed** — push *recreates* a schema index it churns, but *drops and forgets* an index it doesn't know.
A partial index is the same class; expect the churn, accept it (documented), and never SQL-manage.

**Rationale**: `vercel-build` runs `drizzle-kit push` every deploy. Schema-declared guarantees the index is
always present after a deploy even if push churns it; the recreate can't fail because both writers dedup
app-side (no duplicate can be created even during a recreate window). Verify the double-push locally; if it
somehow round-trips cleanly, even better.

## 3. Dedup existing active duplicates: pure `planDedupe` + DB wrapper (per 043's dedupe)

**Decision**: `dedupeActiveApplications()` with a pure `planDedupe(rows)` core (mirroring
`dedupe-user-games.ts`): group active (pending/accepted) rows by `(postingId, applicantId)`; for any group
>1, keep the winner and delete the rest. **Winner rule**: prefer `accepted` over `pending` (an accepted row
backs a real roster seat), tie-broken by oldest `createdAt`, then smallest `id`. Returns `{ groups, deleted }`;
idempotent. Tested purely — once the partial index exists, duplicate active rows are un-insertable, so the
collapse can't be exercised through the DB (same constraint 043 hit).

**Rationale**: Keeps the winner rule readable and unit-testable. Preferring accepted avoids discarding the row
that reflects an actual roster membership. At current scale this almost certainly finds nothing, but the index
creation fails if any active duplicate exists, so it's a required prerequisite.

**Alternatives**: pure-SQL `DELETE USING` self-join (rejected — the multi-key winner rule is fiddly and
un-unit-testable in one statement); keep newest/arbitrary (rejected — could drop the accepted/roster-backed row).

## 4. Conflict-safe writers: keep the select-check, add `onConflictDoNothing().returning()`

**Decision**: In both `apply-to-posting` and `invite-to-party`, keep the existing active-application
select-check (fast path + friendly message), and change the INSERT to
`.onConflictDoNothing().returning({ id })`. If the returned array is empty, a concurrent writer won the race —
return the SAME existing friendly failure (`"You already have an active application to this listing."` /
`"This player already has an active application to this party."`). A bare `ON CONFLICT DO NOTHING` (no target)
catches the partial-index violation; `applications` has no other unique index besides its PK, so it can only
swallow *this* conflict.

**Rationale**: FR-003. The select-check keeps the normal case off the error path; `onConflictDoNothing` +
empty-returning turns the rare lost race into the identical friendly rejection instead of a raw 500 — no need
to catch/parse a `23505` (though `err.cause.code` would be the way if we did; project memory). Retaining the
app-side check is defense-in-depth (mirrors 043's addUserGame).

**Alternatives**: catch `23505` via `err.cause.code` (rejected — makes the race path error-driven; the
returning-empty check is cleaner and needs no error introspection); drop the app-side check and rely only on
the DB (rejected — worse UX, error-path-driven, and the common case shouldn't depend on a DB error).

## 5. Rollout ordering, and CHANGELOG/Patch Notes

**Decision**: Order = **dedup active duplicates → create partial index**. Apply to local first (+ full suite),
then prod by hand before merge (pull prod DATABASE_URL to a temp path outside the repo, run the one-shot
`lockdown-applications` script, verify via `pg_indexes`, delete temp), then merge so the deploy push is a
verified near-no-op. A one-shot `scripts/lockdown-applications.ts` (dedup + create index + verify) mirrors
`lockdown-usergames.ts`, including the guarded `.env.local` load.

Update `CHANGELOG.md` + `status.md` (Principle VI). This is an **invisible correctness fix** — players never
saw the rare duplicate in normal use — so it gets a CHANGELOG line marked "(internal correctness — no Patch
Notes post.)", not a player-facing announcement. Add a future-work note on the seat-reconciliation caveat.
