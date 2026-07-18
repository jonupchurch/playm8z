# Implementation Plan: Enforce blocks on party/listing interactions

**Branch**: `045-enforce-blocks` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/045-enforce-blocks/spec.md`

## Summary

Close a trust/safety gap: the existing bidirectional active-block check (`hasActiveBlockBetween`)
already guards DMs and notifications, but not the four party/listing interaction write paths.
Add the same guard to `apply-to-posting`, `ask-question`, `invite-to-party`, and `accept-request`,
each keyed on the right relationship (applicant↔host, asker↔host, host↔invited, host↔applicant),
symmetric, fail-closed, with a neutral per-path refusal that doesn't leak the block. No schema
change, no new mechanism. `ask-question` additionally gains a posting-existence load (it needs the
host id). ADR 0017 records the cross-cutting invariant and the covered/deferred paths.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router, Server Actions.

**Primary Dependencies**: Drizzle ORM + postgres.js, Auth.js v5 (`requireVerifiedEmail`), Zod. No new deps.

**Storage**: PostgreSQL. Read-only use of `blocks` via the existing `hasActiveBlockBetween`. No schema change.

**Testing**: Vitest (unit/integration, `fileParallelism:false`) — per-path block tests; Playwright unaffected.

**Target Platform**: Vercel. **Project Type**: Web app (single Next.js project).

**Performance Goals**: N/A — one extra indexed block lookup per interaction attempt (negligible).

**Constraints**: Reuse the single existing guard (no second mechanism, no helper-semantics change); symmetric;
fail-closed (a lookup failure refuses, gracefully, never allows); neutral non-leaking errors; preserve all
existing seat/roster/transaction/authorization behavior.

**Scale/Scope**: Small. 4 guarded actions (one also gains a posting load), tests per path, an ADR, a future-work note.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. Spec-Driven & Legible Architecture** — PASS. spec/plan/tasks committed; **ADR 0017** records the
  block-enforcement invariant and the covered-vs-deferred paths.
- **II. Validated Trust Boundaries (NON-NEGOTIABLE)** — PASS, and directly *advances* this principle: it adds a
  missing server-side authorization precondition (the block) to four write paths that trusted only auth +
  input validation. All four already `requireVerifiedEmail` and Zod-validate; this adds the block gate.
- **III. Designed, Accessible Experience** — PASS. No new UI; a refused interaction surfaces through each
  action's existing error channel (the same shape as its other refusals, e.g. "no open spots").
- **IV. Scope Discipline** — PASS. Exactly the four paths the sweep identified; follow/report/forum and the
  applications race are explicitly out of scope and logged.
- **V. Test Discipline** — PASS. Per-path integration tests: refused in both block directions, still succeeds
  unblocked, existing behavior preserved. `fileParallelism:false` and seeded block rows.
- **VI. Legible History** — PASS. Conventional commits, ADR, `CHANGELOG`/`status` updated. "Blocking now
  actually blocks them everywhere you interact" is a real player-facing guarantee, so it warrants a short
  user-facing CHANGELOG line and a Patch Notes post per the standing workflow (research #5).

**No violations. Complexity Tracking not required.**

## Project Structure

### Documentation (this feature)

```text
specs/045-enforce-blocks/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/block-guards.md
├── checklists/requirements.md   (from /speckit-specify)
└── tasks.md                     (/speckit-tasks)
```

### Source Code (repository root)

```text
src/lib/actions/
├── apply-to-posting.ts     # + guard: hasActiveBlockBetween(applicant, host), fail-closed, after posting load
├── ask-question.ts         # + load posting (existence + hostId), then guard: asker↔host
├── invite-to-party.ts      # + guard: host↔invitedUserId, after self/posting/seat checks
└── accept-request.ts       # + guard inside the txn after loading application+posting: applicant↔host -> throw
src/lib/inbox/search-contacts.ts   # hasActiveBlockBetween — reused unchanged (source of truth)

Tests (amend/add):
src/lib/actions/apply-to-posting.test.ts · ask-question.test.ts · invite-to-party.test.ts · accept-request.test.ts
```

**Structure Decision**: Single Next.js project. No new module — each guard is a direct call at its site
(matching `start-conversation.ts`), per the spec's "no over-abstraction" constraint.

## Complexity Tracking

No constitution violations — table omitted.
