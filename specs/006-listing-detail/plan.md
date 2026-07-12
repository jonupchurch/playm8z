# Implementation Plan: Listing detail

**Branch**: `006-listing-detail` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-listing-detail/spec.md`

## Summary

The single-posting page at `/listing/[id]`, public. Introduces the
`applications` and `questions` tables (this feature is their first
real writer), derives the roster from the host plus accepted
Applications rather than a separate table, and reuses Server Actions
(Post a Game's pattern) for applying, withdrawing, asking, and
replying — each gated through Auth & Onboarding's unverified-email
write gate, plus an inline host-only ownership check for replies.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`, `zod`
— all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — two new tables:
`applications` and `questions` (data-model.md). No `RosterSlot` table
(research.md #1).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria beyond
SC-002/SC-005's "immediately" framing, satisfied structurally by a
Server Action followed by Next.js's normal re-render, the same pattern
already used for Post a Game's publish flow.

**Constraints**: Zod validation (Principle II) for every Server
Action's input (application message, question text, reply text).
Authorization here is two-layered in a way earlier features weren't:
*authentication* (is there a session), *email verification* (Auth &
Onboarding's gate), and — new to this feature — *resource ownership*
(is this session's user the listing's host, for the reply action).
WCAG 2.1 AA (Principle III): the roster's dashed open-slot rows need
non-decorative accessible text (not just a visual dash), and the
apply-panel's state changes (confirmation, full, host view) need to be
announced the same `aria-live` way Home/Browse already established.

**Scale/Scope**: 1 new dynamic route (`/listing/[id]`), two new
tables, four Server Actions (apply, withdraw, ask, reply), a derived
(non-stored) roster view.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — dropping `RosterSlot` is a direct, already-documented consequence of ADR 0004, not a new cross-cutting decision, and is recorded in research.md. |
| II. Validated Trust Boundaries | PASS, with action: every Server Action's input is Zod-validated; the reply action additionally checks resource ownership (session user = posting host) server-side, never trusting a client-side "is host" flag. |
| III. Designed, Accessible Experience | PASS, with action: accessible text for open-slot rows (not decoration-only), `aria-live` for the apply panel's state transitions, axe-core scan. |
| IV. Scope Discipline | PASS. Accept/decline/remove-roster-member, Report, and Save are explicitly excluded and logged to `docs/future-work.md`/deferred to Inbox, not silently half-built. |
| V. Test Discipline | PASS, with action: unit tests for the application/question Zod schemas and the roster-derivation logic; integration tests for each Server Action (apply, withdraw, ask, reply, including the host-only and gate-blocked rejection paths); e2e coverage (with axe) for the three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/006-listing-detail/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — every write is a Server Action, not a fetch-based
API route, consistent with Post a Game.

### Source Code (repository root)

```text
src/
├── app/
│   └── listing/
│       └── [id]/
│           └── page.tsx                # new — public; derives
│                                       # viewer state (host / applied
│                                       # / not-applied / full) and
│                                       # renders every section
├── components/
│   └── listing/
│       ├── apply-panel.tsx             # new — Client Component: the
│       │                               # four apply-panel states
│       ├── roster.tsx                  # new — renders the derived
│       │                               # roster (host, accepted
│       │                               # members, open dashes)
│       └── qa-thread.tsx               # new — Client Component: ask
│                                       # + host-only reply controls
│   # Report: added 2026-07-12 (spec.md's amended FR-019) — the
│   # apply-panel's "Report" action opens Notifications + Report
│   # modal's (012) existing report-modal component/action directly,
│   # passing this listing (or a specific Q&A entry) as the target;
│   # no new component or Server Action owned by this feature
├── db/
│   └── schema.ts                       # extended: new `applications`
│                                       # and `questions` tables
│                                       # (data-model.md)
└── lib/
    ├── actions/
    │   ├── apply-to-posting.ts         # new — Server Action
    │   ├── withdraw-application.ts     # new — Server Action
    │   ├── ask-question.ts             # new — Server Action
    │   ├── reply-to-question.ts        # new — Server Action
    │   └── toggle-saved-listing.ts      # new — Server Action, added
    │                                   # 2026-07-12 (spec.md's amended
    │                                   # FR-014/FR-018): inserts/
    │                                   # deletes a row in the
    │                                   # `savedListings` table Profile
    │                                   # (007) defines
    ├── validations/
    │   └── listing-detail.ts           # new — Zod schemas (message,
    │                                   # question text, reply text)
    └── postings/
        └── get-roster.ts                # new — derives roster +
                                        # open-slot count
tests/ (colocated, per existing convention)
├── src/lib/validations/listing-detail.test.ts       # new
├── src/lib/postings/get-roster.test.ts              # new
├── src/lib/actions/apply-to-posting.test.ts         # new
├── src/lib/actions/ask-question.test.ts             # new
├── src/lib/actions/reply-to-question.test.ts        # new
e2e/
└── listing-detail.spec.ts               # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split — additive throughout; reuses the shared `listing-card.tsx`
styling conventions but this page's own header/details/roster/Q&A
sections are new, page-specific components.

## Complexity Tracking

*No violations — table intentionally empty.*
