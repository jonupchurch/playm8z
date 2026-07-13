# Implementation Plan: Admin Dashboard

**Branch**: `015-admin-dashboard` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-admin-dashboard/spec.md`

## Summary

The `/admin` main-content dashboard (sidebar shell is Design System
infra, out of scope): five real-count KPIs, a 7-day activity chart,
Needs-attention counts and Top games (both aggregate queries over
already-existing tables), and a recent-activity feed backed by a new,
mostly-unwritten-yet `auditEntries` table. Gated by Error Pages'
`require-role.ts`.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — one new table, `auditEntries`
(data-model.md); every KPI/chart/needs-attention/top-games value is a
read-only aggregate query over already-existing tables (`user`,
`postings`, `applications`, `forumThreads`, `forumReplies`, `messages`,
`reports`) — no schema changes to any of them.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria, but this
is the first feature whose single page load runs several aggregate
queries across many tables at once — each is scoped (today/7-day
windows, `COUNT`/`GROUP BY`, no unbounded scans) to stay cheap at this
project's scale.

**Constraints**: Zod validation (Principle II) applies minimally here
— no user-submitted input beyond the metric-switcher's own enum value
(client-side UI state, not a trust boundary in the usual sense since
it only picks which already-computed dataset to display). The real
trust-boundary control is `require-role.ts`, checked server-side on
every request to this route, never a client-side "is admin" flag. WCAG
2.1 AA (Principle III): the bar chart needs a non-visual (text/table)
equivalent for its data (not color/height alone), and the metric
switcher needs real selectable-tab semantics.

**Scale/Scope**: 1 new (mostly-empty-for-now) table, 1 gated route, a
handful of read-only aggregate queries, no new Server Actions beyond
the `logAuditEntry()` helper itself (which nothing calls yet).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the "Active today" redefinition and the reports-table reuse are implementation-scoped (research.md), consistent with prior patterns. |
| II. Validated Trust Boundaries | PASS. `require-role.ts` gates the entire route server-side; no other user-submitted input exists on this read-only page. |
| III. Designed, Accessible Experience | PASS, with action: a non-visual equivalent for the bar chart's data, real tab semantics for the metric switcher, axe-core scan. |
| IV. Scope Discipline | PASS. The admin sidebar shell, auto-flag queues, and retrofitting other admin features to call `logAuditEntry()` are all explicitly excluded and logged, not half-built. |
| V. Test Discipline | PASS, with action: unit tests for each aggregate query (KPIs, chart-by-day, needs-attention grouping, top games) against seeded data; integration test confirming `require-role.ts` actually blocks a non-moderator; e2e coverage (with axe) for both user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/015-admin-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — this feature has no fetch-based API surface (a
gated Server Component page plus read-only queries; the one write,
`logAuditEntry()`, is an internal helper other future features import
directly, not a Server Action invoked from a form).

### Source Code (repository root)

```text
src/
├── app/
│   └── admin/
│       └── page.tsx                    # new — require-role.ts gate,
│                                       # renders KPIs + chart + needs-
│                                       # attention + activity + top
│                                       # games (main content only —
│                                       # sidebar is Design System
│                                       # infra, built separately)
├── components/
│   └── admin/
│       ├── kpi-card.tsx                # new
│       ├── activity-chart.tsx          # new — incl. a non-visual
│       │                               # data equivalent
│       ├── needs-attention.tsx         # new
│       ├── recent-activity.tsx         # new — incl. empty state
│       └── top-games.tsx               # new
├── db/
│   └── schema.ts                       # extended: new `auditEntries`
│                                       # table (data-model.md)
└── lib/
    └── admin/
        ├── get-dashboard-kpis.ts        # new — the five KPI values
        ├── get-activity-chart.ts        # new — 7-day, per-metric
        ├── get-needs-attention.ts       # new — `reports` grouped by
        │                               # `targetType`/`status`
        ├── get-top-games.ts             # new — reuses the same
        │                               # aggregate pattern as Home's
        │                               # Trending/Browse's Game facet
        └── log-audit-entry.ts           # new — the reusable helper
                                        # (FR-007); no callers wired up
tests/ (colocated, per existing convention)
├── src/lib/admin/get-dashboard-kpis.test.ts         # new
├── src/lib/admin/get-activity-chart.test.ts         # new
├── src/lib/admin/get-needs-attention.test.ts        # new
├── src/lib/admin/get-top-games.test.ts              # new
e2e/
└── admin-dashboard.spec.ts              # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002-error-pages`) is imported directly.

## Complexity Tracking

*No violations — table intentionally empty.*
