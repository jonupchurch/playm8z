# Implementation Plan: Post a Game

**Branch**: `005-post-game` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-post-game/spec.md`

## Summary

The listing-creation form at `/post`, with a live preview built by
reusing the same shared listing-card component Home and Browse already
consume. A Server Action validates and inserts the posting, gated on
authentication (redirect to `/login`) and on Auth & Onboarding's
unverified-email write gate — the first real consumer of that
ready-built-but-unused helper. Extends the shared `postings` table with
the last few fields this form collects.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`, `zod`
— all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — extends the existing
`postings` table (from `003-home`, extended further by `004-browse`)
with `tags`, `recurring`, `voiceLink` (data-model.md).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria beyond
SC-001's "under 2 minutes" for a minimal submission, which is a UX/form-
friction target, not a technical latency budget.

**Constraints**: Zod validation (Principle II) is central here — this
is the first sizable multi-field write form since Auth & Onboarding's
onboarding wizard, and every value (including the Group size/Spots
open steppers' clamped relationship) is re-validated server-side inside
the Server Action, never trusting the client's own clamping logic as
sufficient. WCAG 2.1 AA (Principle III) — every field needs a
programmatically-associated label, the segmented/chip controls need
real radio-group/checkbox-group semantics (same standard Browse
already established for its facet sidebar), and the stepper buttons
need accessible names beyond "−"/"+" glyphs. axe-core scan required.

**Scale/Scope**: 1 new route (`/post`), one multi-section form (~15
fields), one Server Action, one extended shared table, reuse (not
duplication) of the existing `listing-card.tsx` for the live preview.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the shared-table extension and the write-gate consumption continue patterns already established by Auth & Onboarding, Home, and Browse. |
| II. Validated Trust Boundaries | PASS, with action: a single Zod schema validates every field server-side inside the Server Action, including re-deriving the Group size/Spots open relationship rather than trusting client-side clamping. |
| III. Designed, Accessible Experience | PASS, with action: labeled fields, real radio-group/checkbox-group semantics for segmented and chip controls, accessible stepper button names, axe-core scan. |
| IV. Scope Discipline | PASS. "Save as draft" and any Discord auto-connect behavior are explicitly excluded and logged to `docs/future-work.md`, not silently half-built. |
| V. Test Discipline | PASS, with action: unit tests for the posting Zod schema (including the stepper-clamping refinement); integration test for the Server Action actually inserting a row and for the write gate blocking an unverified session; e2e coverage (with axe) for the happy path, the auth/verification gate, and the validation guardrails. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/005-post-game/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — publishing is a Server Action, not a fetch-based API
route (research.md #1), so the contracts step is skipped per the plan
template's "skip if purely internal" guidance.

### Source Code (repository root)

```text
src/
├── app/
│   └── post/
│       └── page.tsx                    # new — redirects an
│                                       # unauthenticated visitor to
│                                       # /login (FR-016), otherwise
│                                       # renders the form
├── components/
│   └── post-game/
│       └── post-game-form.tsx          # new — Client Component: all
│                                       # sections, live-bound to the
│                                       # shared listing-card.tsx for
│                                       # the preview, submits via the
│                                       # Server Action
├── db/
│   └── schema.ts                       # extended: `postings` gains
│                                       # `tags`, `recurring`,
│                                       # `voiceLink` (data-model.md)
└── lib/
    ├── actions/
    │   └── create-posting.ts           # new — Server Action:
    │                                   # Zod-validates, checks auth +
    │                                   # email-verified (Auth &
    │                                   # Onboarding's require-
    │                                   # verified-email gate,
    │                                   # research.md #4), inserts the
    │                                   # row
    ├── validations/
    │   └── posting.ts                  # new — the full Zod schema
    │                                   # (data-model.md)
    └── postings/
        └── get-game-suggestions.ts     # new — reuses the same
                                        # most-common-games aggregate
                                        # Home's Trending and Browse's
                                        # Game facet already use
                                        # (research.md #2)
tests/ (colocated, per existing convention)
├── src/lib/validations/posting.test.ts          # new
├── src/lib/actions/create-posting.test.ts       # new
e2e/
└── post-game.spec.ts                    # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. The live preview reuses `src/components/listings/listing-card.tsx`
(from `004-browse`) rather than a second near-duplicate card component.

## Complexity Tracking

*No violations — table intentionally empty.*
