# Implementation Plan: Admin News

**Branch**: `020-admin-news` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-admin-news/spec.md`

## Summary

The `/admin/news` CMS: a filterable post list, a two-pane editor with
a live preview, and Publish/Schedule/Update/Save-draft/Delete
actions. This feature is News feed's (`013`) first real `NewsPost`
writer — extends that table with `body` and `status`, reuses its
existing `featured` column for "pin," and includes a small, bounded
amendment to `013`'s `search-news.ts` so the public feed correctly
respects `status`/scheduling (which never existed as a real concept
before this feature).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — extends `newsPosts` (`013`)
with `body` and `status`.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; this
feature's own list is small in scope (an admin-only CMS, not a
public, unboundedly-growing list) — no pagination needed.

**Constraints**: Zod validation (Principle II) for the save/publish/
delete Server Action's input. `require-role.ts` gates the entire
route server-side (moderator minimum — the wireframe's "editor" label
is not a real distinct role). The save action re-verifies the acting
session's role server-side. WCAG 2.1 AA (Principle III): status/
category controls are real buttons with visible active state, not
color-only; the pin toggle has an accessible label/state.

**Scale/Scope**: 2 new fields on `newsPosts` (`body`, `status`), 1
gated route, 1 Server Action (`save-news-post.ts`, handling create/
update/publish/schedule/draft/delete-as-unpublish in one place since
they're all just different `status`/`publishedAt` combinations on the
same row), and one small, bounded amendment to `013`'s
`search-news.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed — collapsing "Delete" into "Unpublish" (status→draft) is a direct application of the already-established Delete-vs-ADR-0005 resolution pattern (Profile, Admin Users); reusing `featured` for "pin" avoids a redundant column. |
| II. Validated Trust Boundaries | PASS, with action: `require-role.ts` gates the route; `save-news-post.ts` re-checks role server-side regardless of what the UI shows. |
| III. Designed, Accessible Experience | PASS, with action: status/category segmented controls and the pin toggle are real, labeled, keyboard-operable controls, not color-only affordances; axe-core scan in e2e. |
| IV. Scope Discipline | PASS. No rich-text/WYSIWYG editor, no real image upload, no author/byline tracking, no background job for scheduled publication — all explicitly out of scope and reasoned in spec.md's Assumptions. |
| V. Test Discipline | PASS, with action: unit tests for the save action's status/`publishedAt`/`featured` branching (research.md #1) and for `013`'s amended query's scheduling logic; integration test for the at-most-one-featured invariant and the role-gate rejection; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/020-admin-news/
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
│   └── admin/
│       └── news/
│           └── page.tsx                # new — require-role.ts gate,
│                                       # two-pane list + editor shell
├── components/
│   └── admin/
│       ├── news-post-list.tsx          # new — filterable list, "+ New"
│       └── news-post-editor.tsx        # new — form + live preview
├── db/
│   └── schema.ts                       # extended: `newsPosts` (013)
│                                       # gains `body`, `status`
└── lib/
    ├── actions/
    │   └── save-news-post.ts           # new — Server Action: create/
    │                                   # update, branching on the
    │                                   # requested action (publish/
    │                                   # schedule/save-draft/delete)
    ├── validations/
    │   └── admin-news.ts                # new — Zod schemas
    └── admin/
        └── get-news-posts.ts            # new — the admin list query
                                        # (all statuses, unlike `013`'s
                                        # public-only one)

# Small, bounded amendment:
# src/lib/news/search-news.ts (013-news-feed) — filter to
# `status = 'published'` OR (`status = 'scheduled'` AND publish
# date/time has passed)

tests/ (colocated, per existing convention)
├── src/lib/validations/admin-news.test.ts           # new
├── src/lib/admin/get-news-posts.test.ts             # new
├── src/lib/actions/save-news-post.test.ts           # new
├── src/lib/news/search-news.test.ts                 # extended (013)
e2e/
└── admin-news.spec.ts                    # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002`) is imported directly, not
reimplemented.

## Complexity Tracking

*No violations — table intentionally empty.*
