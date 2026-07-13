# Implementation Plan: Landing page

**Branch**: `026-landing-page` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-landing-page/spec.md`

## Summary

The public marketing page shown at `/` for unauthenticated visitors:
hero (real "open parties right now" stat, a real floating example
posting), a trust bar (three real stats — total players, distinct
games, parties formed this week), how-it-works, a features grid
(reworded to avoid overstating deferred capabilities), genre browse
(real live counts), fixed testimonial copy, a final CTA, and a
footer. Closes the exact loop Home's (`003`) own spec left open —
its root `page.tsx` now renders this content instead of redirecting
an unauthenticated visitor to `/login`. Adds one small field,
`applications.acceptedAt`.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm` —
no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — adds `applications.acceptedAt`
(`006`/`011`); every other number reuses existing tables (`user`,
`postings`, `contentPages`) read-only.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; every
stat is a simple `COUNT`/`GROUP BY` over already-indexed columns, no
new scaling concern.

**Constraints**: No auth gate on this page itself (it's the
unauthenticated experience); the amendment to Home's (`003`) root
route is the only place a session check happens, and it's a simple
authenticated/unauthenticated branch, not a new gate. WCAG 2.1 AA
(Principle III): the rotating hero word and any animation are
`aria-live`/`aria-hidden` as appropriate and don't interfere with
screen readers; every stat has a text label, not color/number-only.

**Scale/Scope**: 1 new field (`applications.acceptedAt`), 1 bounded
amendment to Home's (`003`) root `page.tsx`, ~4 new read-only query
functions (`get-landing-stats.ts`, reusing Home's/Browse's existing
open-postings queries for the hero card and genre counts), 0 new
Server Actions (this page has no write actions of its own — every
CTA just navigates to an existing route).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed — closing Home's own explicitly-left-open loop and reusing existing open-postings/genre data are both direct continuations of already-planned work. |
| II. Validated Trust Boundaries | N/A for this feature's own scope (no write actions, no user input) — the one schema change (`acceptedAt`) is set by `011`'s already-validated `accept-request.ts`, not by any new input path here. |
| III. Designed, Accessible Experience | PASS, with action: the rotating hero word is `aria-live="off"`/decorative (not disruptively announced); the floating card's fallback state is genuinely accessible, not just visually different; axe-core scan in e2e. |
| IV. Scope Discipline | PASS, explicitly and repeatedly — the online-presence stat, the average-rating stat, and the "reliability scores" claim are all dropped with cited precedent rather than fabricated; testimonials are the one deliberate, reasoned exception, explained rather than silently inconsistent. |
| V. Test Discipline | PASS, with action: unit tests for `get-landing-stats.ts`'s three real computed numbers and the per-genre count query; integration test for `011`'s amended `accept-request.ts` (`acceptedAt` now set); e2e coverage (with axe) for all three user stories, including the authenticated-vs-unauthenticated root-route branch. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/026-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — this feature has no Server Actions or APIs of its
own; every CTA is a plain link/navigation.

### Source Code (repository root)

```text
src/
├── app/
│   └── page.tsx                        # amended (003-home) — renders
│                                       # this feature's content for an
│                                       # unauthenticated visitor
│                                       # instead of redirecting to
│                                       # /login; Home's own
│                                       # authenticated-visitor branch
│                                       # is unchanged
├── components/
│   └── landing/
│       ├── landing-hero.tsx            # new — rotating word, real
│       │                               # open-parties stat, real
│       │                               # floating example card(s)
│       ├── landing-trust-bar.tsx       # new — 3 real stats
│       ├── landing-how-it-works.tsx    # new — static 3-step content
│       ├── landing-features.tsx        # new — static grid, reworded
│       │                               # profiles/ratings copy
│       ├── landing-genres.tsx          # new — real per-genre counts
│       ├── landing-testimonials.tsx    # new — fixed marketing copy
│       └── landing-final-cta.tsx       # new
├── db/
│   └── schema.ts                       # extended: `applications`
│                                       # (006/011) gains `acceptedAt`
└── lib/
    └── landing/
        └── get-landing-stats.ts         # new — total players,
                                        # distinct games, parties
                                        # formed this week, one/two
                                        # real open postings for the
                                        # hero card, per-genre open
                                        # counts

# Small, bounded amendment:
# src/lib/actions/accept-request.ts (011-inbox-messaging) — sets
# `acceptedAt = now()` alongside its existing `status = 'accepted'`
# write

tests/ (colocated, per existing convention)
├── src/lib/landing/get-landing-stats.test.ts        # new
├── src/lib/actions/accept-request.test.ts           # extended (011)
├── src/app/page.test.ts or equivalent               # extended (003) —
│                                                     # authenticated
│                                                     # vs. unauthenticated
│                                                     # branch
e2e/
└── landing-page.spec.ts                  # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. Home's (`003`) root route is amended in place, not duplicated;
this feature's own components are purely presentational/read-only.

## Complexity Tracking

*No violations — table intentionally empty.*
