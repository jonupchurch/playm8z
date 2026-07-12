# Implementation Plan: News feed

**Branch**: `013-news-feed` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-news-feed/spec.md`

## Summary

The public `/news` page: a featured post, category filters, search,
and paginated "Load more," plus a no-login-required newsletter
subscribe strip. Introduces a minimal `newsPosts` table (Home/Post-a-
Game-style minimal-shape-now pattern, extended later by Admin News)
and `newsletterSubscribers`. Filtering follows Browse/Forum's
server-side, URL-driven pattern since posts accumulate over time.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — two new tables, `newsPosts`
(minimal, read-only from this feature) and `newsletterSubscribers`
(data-model.md).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; server-
side, paginated queries (Browse/Forum's established pattern) scale
correctly as posts accumulate.

**Constraints**: Zod validation (Principle II) for `searchParams`
(category, search, page) and the subscribe email — the latter is this
project's first write action with genuinely no authentication
requirement at all, so validation is the *only* trust-boundary control
here (no session to also check). WCAG 2.1 AA (Principle III): category
chips need real selectable semantics (established pattern), and the
subscribe form needs a clear success/already-subscribed confirmation
state, not just a silent no-op on duplicate.

**Scale/Scope**: 2 new tables, 1 route, 1 Server Action (subscribe),
a paginated read query.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the minimal-`newsPosts`-shape and no-auth-subscribe decisions are implementation-scoped (research.md), consistent with established patterns (Home/`postings`, Forum Thread/`ThreadSubscription`). |
| II. Validated Trust Boundaries | PASS, with action: `searchParams` and the subscribe email are both Zod-validated; the subscribe action checks for an existing subscriber before inserting (no duplicates) at the database level via a unique constraint, not just an application check. |
| III. Designed, Accessible Experience | PASS, with action: real selectable category-chip semantics, a clear subscribe success/already-subscribed state, axe-core scan. |
| IV. Scope Discipline | PASS. NewsPost creation/editing/featuring and real newsletter delivery are explicitly excluded and logged, not half-built. |
| V. Test Discipline | PASS, with action: unit tests for the Zod schemas and the featured/filter/pagination query logic; integration test for the subscribe action (including duplicate-email rejection at the database level); e2e coverage (with axe) for both user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/013-news-feed/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — the one write is a Server Action, consistent with
every feature since Post a Game.

### Source Code (repository root)

```text
src/
├── app/
│   └── news/
│       └── page.tsx                    # new — async Server
│                                       # Component, awaits/validates
│                                       # searchParams, queries,
│                                       # renders featured + grid +
│                                       # Load more + subscribe strip
├── components/
│   └── news/
│       ├── news-post-card.tsx          # new
│       ├── featured-post.tsx           # new
│       └── subscribe-strip.tsx         # new
├── db/
│   └── schema.ts                       # extended: new `newsPosts`
│                                       # (minimal, read-only here) and
│                                       # `newsletterSubscribers`
│                                       # tables (data-model.md)
└── lib/
    ├── actions/
    │   └── subscribe-newsletter.ts     # new — Server Action, no
    │                                   # auth required
    ├── validations/
    │   └── news.ts                      # new — Zod schemas
    └── news/
        └── search-news.ts                # new — validated
                                        # searchParams → paginated query
                                        # (Browse/Forum's pattern)
tests/ (colocated, per existing convention)
├── src/lib/validations/news.test.ts                 # new
├── src/lib/news/search-news.test.ts                 # new
├── src/lib/actions/subscribe-newsletter.test.ts     # new
e2e/
└── news-feed.spec.ts                    # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `newsPosts` is intentionally minimal — the future Admin News
feature extends it rather than this feature over-building fields
nothing populates yet.

## Complexity Tracking

*No violations — table intentionally empty.*
