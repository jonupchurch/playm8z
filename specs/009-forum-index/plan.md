# Implementation Plan: Forum index

**Branch**: `009-forum-index` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-forum-index/spec.md`

## Summary

The forum's browse/search/filter/sort landing page at `/forum`, public
to read. Introduces `forumThreads` (this feature's first writer).
Filtering is server-side, URL-search-param-driven — Browse's precedent,
not Home's — since threads accumulate indefinitely. Thread creation
reuses Blocked Users' modal-dialog pattern rather than a full page.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — one new table, `forumThreads`
(data-model.md). Categories are a hardcoded TypeScript const, not a
table (spec.md's Assumptions).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; server-
side filtering (Browse's pattern) is itself the scaling decision for a
thread list that grows indefinitely.

**Constraints**: Zod validation (Principle II) for `searchParams`
(category enum, search text, sort enum) before it reaches the query.
WCAG 2.1 AA (Principle III): the New Thread modal follows Blocked
Users' established focus-trap/`role="dialog"` pattern; category chips
need real selectable/pressed semantics (`aria-pressed` or a
`radiogroup`), not just visual active-state styling.

**Scale/Scope**: 1 new table, 1 route (`/forum`), 1 Server Action
(create thread), 1 reused-pattern modal, a HOT-badge heuristic computed
at read time.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — categories-as-a-hardcoded-set and the HOT-heuristic-vs-stored-PINNED distinction are implementation-scoped (research.md), consistent with prior enum-handling decisions. |
| II. Validated Trust Boundaries | PASS, with action: `searchParams` (category, search text, sort) are Zod-validated before reaching the query, same discipline as Browse; thread-creation input is Zod-validated in its Server Action. |
| III. Designed, Accessible Experience | PASS, with action: reuses Blocked Users' modal-dialog accessibility pattern for New Thread; category chips get real pressed/selected semantics; axe-core scan. |
| IV. Scope Discipline | PASS. Single-thread viewing/replying (Forum Thread), locking/pinning (Admin Forum), and any presence/Discord depiction are explicitly excluded, not half-built. |
| V. Test Discipline | PASS, with action: unit tests for the searchParams schema and the HOT heuristic; integration test for thread creation (including the unverified-user gate); e2e coverage (with axe) for both user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/009-forum-index/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — thread creation is a Server Action, consistent with
every feature since Post a Game.

### Source Code (repository root)

```text
src/
├── app/
│   └── forum/
│       └── page.tsx                    # new — async Server
│                                       # Component, awaits/validates
│                                       # searchParams, queries, renders
│                                       # category chips + thread list
│                                       # + right rail
├── components/
│   └── forum/
│       ├── thread-row.tsx              # new
│       ├── new-thread-modal.tsx        # new — reuses the dialog
│       │                               # pattern from
│       │                               # blocking/block-modal.tsx
│       └── right-rail.tsx              # new — stats + trending tags
├── db/
│   └── schema.ts                       # extended: new `forumThreads`
│                                       # table (data-model.md)
└── lib/
    ├── forum/
    │   ├── categories.ts                # new — the hardcoded category
    │   │                               # const
    │   ├── search-threads.ts            # new — validated searchParams
    │   │                               # → query, incl. HOT heuristic
    │   └── get-forum-stats.ts           # new — member/thread counts,
    │                                   # trending tags
    ├── actions/
    │   └── create-thread.ts            # new — Server Action
    └── validations/
        └── forum.ts                     # new — Zod schemas
tests/ (colocated, per existing convention)
├── src/lib/validations/forum.test.ts                # new
├── src/lib/forum/search-threads.test.ts             # new
├── src/lib/actions/create-thread.test.ts            # new
e2e/
└── forum-index.spec.ts                  # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `new-thread-modal.tsx` follows the same dialog-accessibility
approach `block-modal.tsx` (`008-blocked-users`) established, without
importing that component directly (different content/fields).

## Complexity Tracking

*No violations — table intentionally empty.*
