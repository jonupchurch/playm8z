# Implementation Plan: Content Page

**Branch**: `014-content-page` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-content-page/spec.md`

## Summary

A slug-based public page at `/pages/[slug]`, block-rendered from a
single JSON array on a new `contentPages` table. Moderator-or-higher
users (Error Pages' `require-role.ts`, its first real consumer) get an
inline edit mode, entirely a Client Component holding local draft
state until "Save changes" persists the whole title+blocks array in
one Server Action call.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — one new table, `contentPages`,
with `blocks` as a JSONB column (data-model.md).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; a single
atomic save per edit session (not per-keystroke) is itself the
efficient path here.

**Constraints**: Zod validation (Principle II) for the whole
title+blocks payload on save — a discriminated union per block type,
validated as an array, not just "is this valid JSON." The role check
(`require-role.ts`) runs server-side on both the page load (to decide
draft-visibility, FR-003) and the save/publish actions — never a
client-side-only "is admin" flag deciding what's shown. WCAG 2.1 AA
(Principle III): edit-mode textareas need real labels (not just a
placeholder), reorder/delete controls need accessible names beyond
bare arrows/✕, and the Publish/Draft status needs a non-color-only
indicator.

**Scale/Scope**: 1 new table, 1 dynamic route, 2 Server Actions (save
page, toggle publish status).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the JSONB-blocks-column choice is implementation-scoped (research.md), not a cross-cutting architecture call. |
| II. Validated Trust Boundaries | PASS, with action: the full title+blocks payload is Zod-validated (a discriminated union per block type) before saving; `require-role.ts` gates both visibility of drafts and the edit/publish actions, server-side. |
| III. Designed, Accessible Experience | PASS, with action: real labels for edit-mode fields, accessible names for icon-only reorder/delete controls, a non-color-only publish-status indicator, axe-core scan. |
| IV. Scope Discipline | PASS. Creating a new page/choosing a slug is explicitly excluded (Admin Content Pages' future job), not half-built. |
| V. Test Discipline | PASS, with action: unit tests for the block-array Zod schema; integration tests for save/publish (including the role-gate rejection and the draft-hidden-from-non-admins behavior); e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/014-content-page/
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
│   └── pages/
│       └── [slug]/
│           └── page.tsx                # new — public render; calls
│                                       # `notFound()` for a missing or
│                                       # (non-admin-viewed) draft slug
├── components/
│   └── content-page/
│       ├── block-renderer.tsx          # new — view-mode rendering for
│       │                               # all six block types
│       └── page-editor.tsx             # new — Client Component:
│                                       # local draft state, add/
│                                       # reorder/delete/edit, Save/
│                                       # Cancel
├── db/
│   └── schema.ts                       # extended: new `contentPages`
│                                       # table, `blocks` as JSONB
│                                       # (data-model.md)
└── lib/
    ├── actions/
    │   ├── save-content-page.ts        # new — Server Action
    │   └── toggle-page-status.ts       # new — Server Action
    └── validations/
        └── content-page.ts              # new — the block discriminated-
                                        # union Zod schema
tests/ (colocated, per existing convention)
├── src/lib/validations/content-page.test.ts         # new
├── src/lib/actions/save-content-page.test.ts        # new
├── src/lib/actions/toggle-page-status.test.ts       # new
e2e/
└── content-page.spec.ts                 # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002-error-pages`) is imported directly, not
reimplemented.

## Complexity Tracking

*No violations — table intentionally empty.*
