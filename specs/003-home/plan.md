# Implementation Plan: Home

**Branch**: `003-home` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-home/spec.md`

## Summary

The search-first discovery page at `/`: a live-filterable feed of
currently-open postings, a recalculated-per-load Trending row, and an
empty state. Technical approach: one server-side fetch per page load
(open postings + trending aggregate), then entirely client-side
search/filter/sort — mirroring the wireframe's own reference
implementation — so no new API routes are needed. Adds a new, minimal
`postings` table (Home is the first feature to need it); Post a Game's
future plan extends the same table rather than this feature building a
throwaway shape.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`, `zod`
— all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — one new minimal `postings`
table (data-model.md), local Postgres for dev / Neon for Production
and Preview, same as every other feature.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria in spec.md.
SC-002 ("updates without a full page reload") is satisfied structurally
by filtering client-side over an already-fetched list rather than
round-tripping per keystroke — there's no per-interaction network
latency to budget for.

**Constraints**: WCAG 2.1 AA (Principle III) — first feature with live
client-side filtering; the feed's result count and content changes need
an `aria-live` region so screen-reader users get the same "it just
updated" signal sighted users get from watching the grid change, and
every chip/sort control must be keyboard-operable. No new user-submitted
trust boundary (Principle II) — search/filter state only narrows
already-visible public data; if it's ever reflected in the URL as a
query param, it still gets a light Zod parse for defensive shape safety
before use, even though the data it filters is already public.

**Scale/Scope**: 1 new table (minimal shape, extensible later), 1
reworked route (`src/app/page.tsx`, currently the default Next.js
scaffold splash), a handful of small components, two read-only server
queries (open postings, trending aggregate).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the shared-table-ownership and interim-redirect decisions are implementation-scoped (research.md), following the same pattern already established by Auth & Onboarding (extending `user`) and Error Pages (adding `settings`). |
| II. Validated Trust Boundaries | PASS. No new user-submitted writes in this feature; any URL-reflected filter state still gets a defensive Zod parse before use. |
| III. Designed, Accessible Experience | PASS, with action: first feature with live client-side filtering — `aria-live` region for feed/result-count changes, full keyboard operability for chips/sort, axe-core scan. |
| IV. Scope Discipline | PASS. Browse's full faceted depth and Post a Game's write path are explicitly not built here — Home only reads. The shared nav/footer are Design System infrastructure, out of this feature's own scope. |
| V. Test Discipline | PASS, with action: unit tests for the trending-aggregate query and the client-side filter/sort logic; integration test confirming the open-postings query reads real rows from Postgres; e2e coverage (with axe) for search, filter, sort, trending click-through, and the empty state. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/003-home/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — this feature adds no fetch-based API surface (a
Server Component data fetch plus client-side filtering, no new route
handlers), so the contracts step is skipped per the plan template's
"skip if purely internal" guidance.

### Source Code (repository root)

```text
src/
├── app/
│   └── page.tsx                        # modified — replaces the default
│                                       # Next.js scaffold splash with
│                                       # Home's real content; redirects
│                                       # an unauthenticated visitor to
│                                       # /login (research.md #3)
├── components/
│   └── home/
│       ├── live-feed.tsx                # new — Client Component: search
│       │                                # text, vibe/region chips, sort,
│       │                                # renders listing cards
│       ├── listing-card.tsx             # new — one card
│       ├── trending-row.tsx             # new — Client Component: click
│       │                                # narrows live-feed.tsx's state
│       └── empty-state.tsx              # new — no-match state + CTA
├── db/
│   └── schema.ts                        # extended: new minimal
│                                       # `postings` table (data-model.md)
└── lib/
    └── postings/
        ├── get-open-postings.ts         # new — server-side read
        └── get-trending.ts              # new — server-side aggregate
tests/ (colocated, per existing convention)
├── src/lib/postings/get-open-postings.test.ts   # new
├── src/lib/postings/get-trending.test.ts        # new
├── src/components/home/live-feed.test.tsx       # new
e2e/
└── home.spec.ts                          # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split — matches the existing repo layout. `src/app/page.tsx` is the
one existing file this feature meaningfully replaces (it's currently
the unmodified `create-next-app` splash); everything else is additive.

## Complexity Tracking

*No violations — table intentionally empty.*
