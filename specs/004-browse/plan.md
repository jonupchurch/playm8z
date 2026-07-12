# Implementation Plan: Browse

**Branch**: `004-browse` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-browse/spec.md`

## Summary

The full faceted discovery page at `/browse`, public (no authentication
required). Unlike Home's small "recent slice" filtered client-side,
Browse's facet state lives in the URL's search params and drives a
real server-side Postgres query — giving shareable/bookmarkable
filtered URLs and scaling correctly as the number of open postings
grows, rather than shipping the entire dataset to the browser. Extends
Home's `postings` table with the additional fields Browse's facets
need, and extends (rather than duplicates) the shared listing-card
component Home introduced.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`, `zod`
— all already installed, no new runtime dependencies. Per AGENTS.md's
instruction to verify current API shape: confirmed in `node_modules/
next/dist/docs/` that `searchParams` on a `page.tsx` is a **Promise**
in this Next.js version (`Promise<{ [key: string]: string | string[] |
undefined }>`), not the synchronous object of older Next.js versions —
the page component must `await` it.

**Storage**: PostgreSQL via Drizzle ORM — extends the existing
`postings` table (from `003-home`) with `genre`, `ageGroup`,
`timeSlots`, `platform`, `micRequired`, and `scheduledDate`
(data-model.md).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria in spec.md.
Filtering server-side (rather than shipping the full open-postings set
to the browser, as Home does for its smaller slice) is itself the
performance-scaling decision here — see research.md #1.

**Constraints**: WCAG 2.1 AA (Principle III) — the sidebar's checklist
facets (Game, Region) need real checkbox semantics, its segmented
facets (Vibe, Age group, Open slots, Platform) need real radio-group
semantics, and the results count needs the same `aria-live` pattern
Home established, all keyboard-operable with visible focus. Validated
Trust Boundaries (Principle II) apply more directly here than in Home:
`searchParams` values feed straight into a Drizzle query's `WHERE`
clause, so every facet value is Zod-validated (enum membership,
bounded array length) before use — never trusted as pre-shaped input,
regardless of how the UI itself constrains what a normal user could
send.

**Scale/Scope**: 1 extended table, 1 new route (`src/app/browse/
page.tsx`), an extended shared listing-card component, a filter
sidebar, an active-filter-pills row, and one server-side query builder
handling every facet combination.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the shared-table extension and shared-component relocation are implementation-scoped (research.md), continuing the pattern from Auth & Onboarding, Error Pages, and Home. |
| II. Validated Trust Boundaries | PASS, with action: every facet value read from `searchParams` is Zod-validated (enum/shape) before it can reach the query builder — this is the first feature where unvalidated input could otherwise shape a real SQL `WHERE` clause. |
| III. Designed, Accessible Experience | PASS, with action: real checkbox/radio-group semantics for the sidebar facets (not styled `<div>`s), `aria-live` result count (matching Home's pattern), axe-core scan. |
| IV. Scope Discipline | PASS. Post a Game's write path and Listing detail's own page are explicitly not built here — Browse only reads and links out. |
| V. Test Discipline | PASS, with action: unit tests for the query-builder's facet-combination logic (AND across facets, OR within a multi-select facet) and the Zod schemas for `searchParams`; integration test confirming the query reads real seeded rows from Postgres; e2e coverage (with axe) for search, multi-facet combination, pills, sort, and the empty state. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/004-browse/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — this feature adds no fetch-based API surface (a
Server Component reading `searchParams` and querying directly, no new
route handlers), so the contracts step is skipped per the plan
template's "skip if purely internal" guidance.

### Source Code (repository root)

```text
src/
├── app/
│   └── browse/
│       └── page.tsx                    # new — async Server Component,
│                                       # awaits searchParams, Zod-
│                                       # validates it, runs the query,
│                                       # renders sidebar + results
├── components/
│   ├── listings/
│   │   └── listing-card.tsx            # relocated from
│   │                                   # components/home/ (research.md
│   │                                   # #3) and extended with the
│   │                                   # genre eyebrow + time-slot tag
│   │                                   # Browse's data includes
│   └── browse/
│       ├── filter-sidebar.tsx          # new — Client Component; every
│       │                               # control updates the URL's
│       │                               # search params (debounced for
│       │                               # the keyword field)
│       ├── active-pills.tsx            # new
│       └── browse-empty-state.tsx      # new — distinct from Home's
│                                       # empty-state.tsx (two actions:
│                                       # Clear filters + Post a game)
├── db/
│   └── schema.ts                       # extended: `postings` gains
│                                       # genre/ageGroup/timeSlots/
│                                       # platform/micRequired/
│                                       # scheduledDate (data-model.md)
└── lib/
    ├── postings/
    │   └── search-postings.ts          # new — Zod-validates
    │                                   # searchParams, builds and runs
    │                                   # the faceted query
    └── validations/
        └── browse-filters.ts           # new — the searchParams schema
tests/ (colocated, per existing convention)
├── src/lib/postings/search-postings.test.ts     # new
├── src/lib/validations/browse-filters.test.ts   # new
e2e/
└── browse.spec.ts                       # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `listing-card.tsx` moves to a shared, feature-agnostic location
since both Home and Browse now consume it — everything else is
additive.

## Complexity Tracking

*No violations — table intentionally empty.*
