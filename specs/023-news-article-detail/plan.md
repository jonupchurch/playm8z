# Implementation Plan: News Article detail

**Branch**: `023-news-article-detail` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-news-article-detail/spec.md`

## Summary

The public `/news/:slug` article page: meta/title/author/cover/body
(markdown rendered to HTML)/tags/related articles/subscribe box
(public, no auth to read), plus Like (reusing `010`'s polymorphic
`likes` table) and Save (new `savedNewsPosts` table, surfaced in
Profile's, `007`, Saved tab). Adds the missing `newsPosts.slug`
column with a bounded amendment to Admin News' (`020`)
`save-news-post.ts` (slug generation) and to News feed's (`013`) card
linking.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod`, a markdown-to-HTML renderer (small, well-established library —
research.md #1) — the only new runtime dependency this feature adds.

**Storage**: PostgreSQL via Drizzle ORM — adds `newsPosts.slug`; new
`savedNewsPosts` table; extends `010`'s `likes` with a third
`targetType`.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; a single
article's own data (likes count, related articles) is small and
bounded per page.

**Constraints**: Zod validation (Principle II) for Like/Save's Server
Action input. `require-verified-email.ts` (`001`) gates Like/Save,
consistent with every other write action; viewing the article itself
requires no auth. WCAG 2.1 AA (Principle III): Like/Save controls
have accessible labels reflecting current state, not color/icon-only;
the reading-progress bar is decorative (`aria-hidden`), not a
substitute for real navigation landmarks.

**Scale/Scope**: 1 new field (`newsPosts.slug`), 1 new table
(`savedNewsPosts`), 1 extended table (`likes` gains a third
`targetType`), 1 public route (`/news/[slug]`), 2 new Server Actions
(`toggle-news-like.ts`, `toggle-saved-news-post.ts`), small bounded
amendments to `020`'s `save-news-post.ts`, `013`'s card component,
and `007`'s Saved tab.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed — reusing `010`'s polymorphic `likes` table (third consumer) and NOT prematurely generalizing `SavedListing` (only second consumer, below this project's established "generalize at three" bar) are both direct applications of existing precedent. |
| II. Validated Trust Boundaries | PASS, with action: `require-verified-email.ts` gates Like/Save; both Server Actions re-verify session/verification server-side. |
| III. Designed, Accessible Experience | PASS, with action: Like/Save buttons are real, labeled, stateful controls; the progress bar is `aria-hidden` decorative; axe-core scan in e2e. |
| IV. Scope Discipline | PASS. `readTimeMinutes` cleanup and `SavedListing` generalization are both explicitly deferred/out of scope with cited reasoning, not built speculatively. |
| V. Test Discipline | PASS, with action: unit tests for the computed-read-time calculation and the not-found/live-status gate; integration tests for Like/Save toggles, the amended `save-news-post.ts` slug generation, and unauthenticated/unverified rejection; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/023-news-article-detail/
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
│   └── news/
│       └── [slug]/
│           └── page.tsx                # new — public, no auth gate
│                                       # to view; not-found for a
│                                       # non-live/nonexistent slug
├── components/
│   └── news/
│       ├── article-header.tsx          # new — meta, title, author,
│       │                               # Like/Save/Share row
│       ├── article-body.tsx            # new — markdown-to-HTML
│       │                               # rendered body
│       ├── article-related.tsx         # new — "Keep reading" grid
│       │                               # (reuses 013's query)
│       └── reading-progress.tsx        # new — client-only scroll
│                                       # indicator, no server state
├── db/
│   └── schema.ts                       # new `savedNewsPosts` table;
│                                       # `newsPosts` (013/020) gains
│                                       # `slug`; `likes` (010) gains
│                                       # a third `targetType` value
└── lib/
    ├── actions/
    │   ├── toggle-news-like.ts          # new — Server Action
    │   └── toggle-saved-news-post.ts    # new — Server Action
    ├── validations/
    │   └── news-article.ts               # new — Zod schemas
    └── news/
        └── get-news-article.ts           # new — article + computed
                                         # read time + like/save state
                                         # + related articles

# Small, bounded amendments (research.md #2-#4):
# src/lib/actions/save-news-post.ts (020-admin-news) — generates a
# unique slug from the title, once, at creation
# News feed's card component (013-news-feed) — links each card to
# `/news/{slug}`
# Profile's Saved tab (007-profile-and-account-settings) — adds a
# "Saved articles" section reading from `savedNewsPosts`

tests/ (colocated, per existing convention)
├── src/lib/validations/news-article.test.ts         # new
├── src/lib/news/get-news-article.test.ts            # new
├── src/lib/actions/toggle-news-like.test.ts         # new
├── src/lib/actions/toggle-saved-news-post.test.ts   # new
├── src/lib/actions/save-news-post.test.ts           # extended (020)
e2e/
└── news-article-detail.spec.ts           # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-verified-email.ts` (`001`) and `013`'s
`subscribe-newsletter.ts` are imported/reused directly.

## Complexity Tracking

*No violations — table intentionally empty.*
