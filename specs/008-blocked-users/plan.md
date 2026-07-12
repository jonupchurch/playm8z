# Implementation Plan: Blocked Users

**Branch**: `008-blocked-users` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-blocked-users/spec.md`

## Summary

The block-management page at `/profile/account/blocked` (a new route
nested under Profile's existing `/profile/account`), plus a reusable
Block modal and a focused Unblock confirm. Introduces `blocks` and
`reports` (this feature's first writes to either), both consulted —
not enforced — by this feature alone; other features are responsible
for checking `blocks` themselves.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — two new tables, `blocks` and
`reports` (data-model.md).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; standard
Server Action + re-render, consistent with every feature since Post a
Game.

**Constraints**: Zod validation (Principle II) for the search query and
the block/report Server Action inputs. WCAG 2.1 AA (Principle III):
both modals are focus-trapped dialogs (matching the wireframe's
overlay pattern) with proper `role="dialog"`/labelled-by semantics and
full keyboard operability (Escape to close, focus returned to the
triggering control) — the first modal-dialog UI this project has built
(prior features used inline panels/pages, not overlays).

**Scale/Scope**: 1 new nested route, 2 new tables, 2 Server Actions
(block, unblock) plus the minimal report-write folded into the block
action, one reusable modal component.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — `blocks`/`reports` are new shared entities defined here, consistent with the project's established "first feature that needs it defines it" pattern. |
| II. Validated Trust Boundaries | PASS, with action: search query and both Server Actions' inputs are Zod-validated; self-block and already-blocked-target attempts are rejected server-side, not just hidden from the candidate list client-side. |
| III. Designed, Accessible Experience | PASS, with action: this project's first real modal-dialog UI — focus trap, `role="dialog"`, labelled-by, Escape-to-close, focus restoration, axe-core scan. |
| IV. Scope Discipline | PASS. Block *enforcement* elsewhere, and any Report review/queue UI, are explicitly out of scope and logged (`docs/future-work.md`, spec.md's Assumptions) rather than half-built. |
| V. Test Discipline | PASS, with action: unit tests for the Zod schemas; integration tests for block/unblock (including self-block rejection, duplicate-block rejection, the report-row side effect, and the unverified-user gate); e2e coverage (with axe) for both user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/008-blocked-users/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — every write is a Server Action, consistent with
every feature since Post a Game.

### Source Code (repository root)

```text
src/
├── app/
│   └── profile/
│       └── account/
│           └── blocked/
│               └── page.tsx             # new — list, search, empty
│                                       # states, opens the modals
├── components/
│   └── blocking/
│       ├── block-modal.tsx             # new — reusable (accepts an
│       │                               # optional pre-selected
│       │                               # target), two steps
│       └── unblock-modal.tsx           # new — focused confirm
├── db/
│   └── schema.ts                       # extended: new `blocks` and
│                                       # `reports` tables
│                                       # (data-model.md)
└── lib/
    ├── actions/
    │   ├── block-user.ts               # new — Server Action;
    │   │                               # optionally also inserts a
    │   │                               # `reports` row
    │   └── unblock-user.ts             # new — Server Action
    ├── validations/
    │   └── blocking.ts                  # new — Zod schemas
    └── users/
        └── search-users.ts              # new — candidate search for
                                        # the pick step
tests/ (colocated, per existing convention)
├── src/lib/validations/blocking.test.ts             # new
├── src/lib/actions/block-user.test.ts               # new
├── src/lib/actions/unblock-user.test.ts             # new
e2e/
└── blocked-users.spec.ts                # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. The new route nests under Profile's existing `/profile/account`
— Profile's own Account page (`007-profile-and-account-settings`)
gets a one-line link added to it, tracked as a task in this feature
rather than a full amendment to Profile's docs, since it's purely
additive (a new link, nothing existing changes).

## Complexity Tracking

*No violations — table intentionally empty.*
