# Implementation Plan: Prevent duplicate active applications

**Branch**: `046-applications-unique-active` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/046-applications-unique-active/spec.md`

## Summary

Close the `applications` active-uniqueness TOCTOU race. Add a **partial unique index** on
`(postingId, applicantId) WHERE status IN ('pending','accepted')` so no concurrent apply/invite race can
create two active rows for one pair; keep the existing app-side select-check in both writers as the fast,
friendly path; make both writers conflict-safe (`onConflictDoNothing` + treat a swallowed conflict as the
existing "already has an active application" rejection); and collapse any pre-existing active duplicates
first (keep `accepted` over `pending`, then oldest). Shape mirrors 043: schema-declared index, drizzle-kit
push double-push idempotency gate, by-hand prod DDL before merge. ADR 0018 supersedes the schema's
"no DB constraint" note.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router, Server Actions. **Deps**: Drizzle + postgres.js,
Zod. No new deps.

**Storage**: PostgreSQL (local + Neon prod). `vercel-build` runs `drizzle-kit push` every deploy.

**Testing**: Vitest (`fileParallelism:false`) — concurrency tests via `Promise.all`; Playwright unaffected.

**Target Platform**: Vercel. **Project Type**: Web app.

**Constraints**: match the existing active definition (pending|accepted); retain the app-side check
(defense-in-depth); prod DDL by hand before merge; verify by querying; dedup active duplicates before the
index (creation fails otherwise).

**Scale/Scope**: Small (shape ≈ 043). A partial unique index, a one-time dedup, two writers made
conflict-safe, a schema comment update, an ADR. Dedup almost certainly a no-op at current scale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. Spec-Driven & Legible** — PASS. spec/plan/tasks committed; **ADR 0018** records the decision and
  supersedes the schema's "no DB constraint" rationale (lines ~269-272).
- **II. Validated Trust Boundaries** — PASS, advances it: adds the missing data-layer integrity guarantee the
  app-side check alone can't provide under concurrency. Writers still `requireVerifiedEmail` + Zod-validate.
- **III. Designed, Accessible Experience** — PASS. No UI change; the friendly rejection message is unchanged.
- **IV. Scope Discipline** — PASS. Bounded to `applications` active-uniqueness; status/transitions/seat
  accounting and other tables explicitly out of scope. Seat-reconciliation caveat logged.
- **V. Test Discipline** — PASS. Concurrency tests (double-apply, apply+invite → one row, no error), re-apply
  after decline/withdraw, dedup winner rule (accepted>pending>oldest), idempotency.
- **VI. Legible History** — PASS. Conventional commits, ADR, CHANGELOG/status updated. Player-facing effect is
  thin (a rare duplicate no longer appears); leaning to a short CHANGELOG line but likely NO patch note (an
  invisible correctness fix) — decided at CHANGELOG time (research #5).

**No violations. Complexity Tracking not required.**

## Project Structure

```text
specs/046-applications-unique-active/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/uniqueness-and-migration.md
├── checklists/requirements.md
└── tasks.md

src/db/schema.ts                       # partial uniqueIndex on applications; update the "no constraint" comment
src/lib/actions/apply-to-posting.ts    # keep select-check; INSERT -> onConflictDoNothing; swallowed conflict -> friendly rejection
src/lib/actions/invite-to-party.ts     # same conflict-safe treatment
src/lib/applications/dedupe-active-applications.ts   # NEW: planDedupe (pure) + dedupeActiveApplications() (DB wrapper)
scripts/lockdown-applications.ts       # NEW: idempotent dedup + create partial index + verify (local + prod)

Tests:
src/lib/applications/dedupe-active-applications.test.ts   # NEW (pure winner rule + DB no-op)
src/lib/actions/apply-to-posting.test.ts · invite-to-party.test.ts   # ADD concurrency + conflict-safe cases
```

**Structure Decision**: Single Next.js project. New dedupe lib + one-shot migration script mirror 043's
`dedupe-user-games.ts` / `lockdown-usergames.ts` exactly.

## Complexity Tracking

No violations — table omitted.
