# Implementation Plan: Notifications + Report modal

**Branch**: `012-notifications-and-report-modal` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-notifications-and-report-modal/spec.md`

## Summary

A bell dropdown (added to the shared nav shell's existing slot) plus a
full `/notifications` page, and a reusable three-step Report modal.
Introduces `notifications` and a `createNotification()` helper (no
retrofit of other features' actions — see spec.md's Assumptions).
Gives Blocked Users' `reports` table its first real `reason` values.
Accept/Decline reuses Inbox's existing Server Actions directly.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — one new table, `notifications`
(data-model.md); writes real `reason` values into the existing `reports`
table (`008-blocked-users`); may write a new row into the existing
`blocks` table (same feature) when "Also block" is checked.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; standard
Server Action + re-render pattern throughout.

**Constraints**: Zod validation (Principle II) for the report flow's
reason/details and every Server Action's input. WCAG 2.1 AA
(Principle III): the bell dropdown is a real disclosure widget
(`aria-expanded`, `aria-haspopup`, keyboard-dismissible), the report
modal follows the now-established dialog pattern (Blocked Users, Forum
index), and unread/read notification state needs a non-color-only
signal (not just a colored dot).

**Scale/Scope**: 1 new table, 1 route, 1 nav-level dropdown, a
report-flow modal, ~4 Server Actions (mark-read, mark-all-read,
submit-report — accept/decline are reused, not new).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — reusing Inbox's accept/decline and Blocked Users' `reports`/`blocks` tables are implementation-scoped decisions (research.md), continuing established patterns. |
| II. Validated Trust Boundaries | PASS, with action: report-flow input (reason enum, details, target) is Zod-validated; the report/block Server Action re-verifies auth + email-verification server-side. |
| III. Designed, Accessible Experience | PASS, with action: a real disclosure-widget bell dropdown, the established modal-dialog pattern for the report flow, non-color-only unread indicators, axe-core scan. |
| IV. Scope Discipline | PASS. Retrofitting other features' write actions to call `createNotification()`, and upgrading Blocked Users'/Forum Thread's simpler report mechanisms to this modal, are both explicitly excluded and logged (`docs/future-work.md`), not half-built. |
| V. Test Discipline | PASS, with action: unit tests for the Zod schemas and the filter/grouping logic; integration tests for mark-read/mark-all-read and the report+optional-block transaction; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/012-notifications-and-report-modal/
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
│   └── notifications/
│       └── page.tsx                    # new — filters, Today/
│                                       # Earlier grouping, mark-read/
│                                       # mark-all-read
├── components/
│   ├── nav/
│   │   └── notification-bell.tsx       # new — added into the shared
│   │                                   # nav shell's existing slot
│   │                                   # (Design System infra, exempt
│   │                                   # from the gate; this feature
│   │                                   # owns what's inside the slot)
│   └── reports/
│       └── report-modal.tsx            # new — the reusable 3-step
│                                       # flow (reason → details/block
│                                       # → done), follows the
│                                       # established dialog pattern
├── db/
│   └── schema.ts                       # extended: new `notifications`
│                                       # table (data-model.md)
└── lib/
    ├── actions/
    │   ├── mark-notification-read.ts   # new — Server Action
    │   ├── mark-all-read.ts            # new — Server Action
    │   └── submit-report.ts            # new — Server Action; writes
    │                                   # `reports` (real `reason`)
    │                                   # and, optionally, `blocks`
    │                                   # (both `008`'s tables)
    ├── validations/
    │   └── notifications.ts             # new — Zod schemas
    └── notifications/
        ├── create-notification.ts       # new — the reusable helper
        │                               # (FR-009); no callers wired
        │                               # up by this feature itself
        └── get-notifications.ts         # new — filtered/grouped read
tests/ (colocated, per existing convention)
├── src/lib/validations/notifications.test.ts        # new
├── src/lib/notifications/create-notification.test.ts # new
├── src/lib/notifications/get-notifications.test.ts   # new
├── src/lib/actions/submit-report.test.ts             # new
e2e/
└── notifications.spec.ts                # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. Accept/Decline on a request notification calls Inbox's
(`011-inbox-messaging`) existing `accept-request.ts`/`decline-request.ts`
directly — no new files for that logic.

## Complexity Tracking

*No violations — table intentionally empty.*
