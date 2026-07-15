# Implementation Plan: Admin-Only AI Writing Assist (News & Content Pages)

**Branch**: `028-ai-writing-assist` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-ai-writing-assist/spec.md`

## Summary

Add two admin-only actions — "Write from scratch" and "Improve/rewrite" — to the Admin News (020) and Admin Content Pages (021) editors, calling Claude Haiku via the Vercel AI SDK + AI Gateway (ADR 0007). Both actions only ever populate existing, already-editable draft form state; neither saves or publishes anything. Gated at `admin` (not `moderator`), matching Admin Settings' (024) precedent. No new schema/persisted entity — audit logging reuses the existing mechanism (015).

## Technical Context

**Language/Version**: TypeScript (strict mode), Next.js App Router — no change from the constitution's Technology Constraints.

**Primary Dependencies**: `ai` (Vercel AI SDK, newly added) via the Vercel AI Gateway (`model: "anthropic/claude-haiku-4.5"`, research.md #1). Zod for the two new trust-boundary validations (topic input, text-to-improve input).

**Storage**: N/A — no schema change. Reuses `auditEntries` (015) for logging only.

**Testing**: Vitest for the actual business logic (the three new Server Actions, `ai`'s `generateText` mocked via `vi.mock("ai", ...)` — never a real network call in tests). Playwright e2e for the admin-only gate and control visibility/availability state only — never clicking a request through to a real AI response (research.md #7).

**Target Platform**: Web (existing Next.js app on Vercel) — this feature also requires `AI_GATEWAY_API_KEY` to be provisioned (research.md #8), which isn't yet present in `.env.local`/`.env.example`.

**Project Type**: Single Next.js web application (existing repo, no new project).

**Performance Goals**: SC-001's "under 30 seconds" for a generated draft — bounded by the model's own response time, no additional engineering needed beyond not adding unnecessary round-trips.

**Constraints**: Neither action may write to the database directly (FR-004) — both only return data that populates existing client-side draft state, exactly as if the admin had typed it.

**Scale/Scope**: Three new Server Actions, a small shared AI-client helper module, and UI additions to two existing editor components. No new page, route, or schema.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development & Legible Architecture**: Satisfied by this spec/plan. The provider-choice tradeoff (Vercel AI SDK + AI Gateway vs. a direct Anthropic SDK) is a real, non-trivial decision — recorded as [ADR 0007](../../docs/adr/0007-ai-writing-assist-via-vercel-ai-gateway.md) per Principle I's explicit "third-party integration" trigger.
- **II. Validated Trust Boundaries**: Both new inputs (topic; text-to-improve) are Zod-validated before use (research.md #4). The AI's structured "write from scratch" output is validated by the very Zod schema passed to `Output.object()` — the SDK will not return non-conforming data, so this satisfies the boundary without a separate re-validation step. No new `any`/`unknown` crosses uncontrolled.
- **III. Designed, Accessible Experience**: New controls (a topic input + "Write from scratch" button; an "Improve/rewrite" button per relevant field/block) MUST reuse the two editors' existing token classes/visual language, MUST have a real accessible name (not an icon-only button with no label), MUST show a clear, distinguishable in-progress state while a request runs (matching `resources/guidelines.md` §4.6's established loading/pending-state pattern), and MUST leave the prior draft state visible/intact on error rather than a blank or broken state (FR-006).
- **IV. Scope Discipline (NON-NEGOTIABLE)**: Frozen to spec.md's boundaries — Admin Forum excluded (`docs/future-work.md`), no rate-limit/usage-cap scope creep, no changes to category/tags/slug/publish-status fields, no new save path. Any adjacent idea goes to `docs/future-work.md`.
- **V. Test Discipline**: Vitest covers the three Server Actions' real logic (input validation, prompt construction, audit-log call) with the AI SDK mocked; Playwright covers the admin-only gate and control-availability state only (research.md #7) — deliberately not the full generate-and-populate flow, to avoid e2e tests depending on a real, billed, non-deterministic external API on every CI run.
- **VI. Legible History**: One (or a small number of) atomic `feat:` commit(s); `CHANGELOG.md`/`status.md`/`docs/feature-list.md` updated (entry 28); ADR 0007 already written alongside this plan, not deferred.

No violations — Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/028-ai-writing-assist/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output (validation guide)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by this command)
```

No `data-model.md` and no `contracts/` — no new persisted entity, and Server Actions are this project's established internal-RPC pattern with no prior precedent of a `contracts/` folder for them (research.md #6).

### Source Code (repository root)

Single existing Next.js project (`src/` layout, `@/*` alias) — no new project.

```text
src/
├── lib/ai/
│   └── gateway.ts                       # NEW -- shared model constant + thin generateText/Output.object wrappers
├── lib/actions/
│   ├── generate-news-draft.ts           # NEW -- "Write from scratch" for News (Output.object, News schema)
│   ├── generate-content-page-draft.ts   # NEW -- "Write from scratch" for Content Pages (Output.object, blocks schema)
│   └── improve-draft-text.ts            # NEW -- shared "Improve/rewrite" for both surfaces (plain generateText)
├── lib/validations/
│   └── ai-writing-assist.ts             # NEW -- Zod schemas for the two inbound inputs + the two structured-draft outputs
├── components/admin/
│   └── news-post-editor.tsx             # MODIFIED -- add "Write from scratch" + "Improve/rewrite" controls
├── components/content-page/
│   └── page-editor.tsx                  # MODIFIED -- add "Write from scratch" + per-block "Improve/rewrite" controls
├── app/admin/news/page.tsx              # MODIFIED -- resolve getCurrentRole(), pass isAdmin to NewsPostEditor
├── app/pages/[slug]/page.tsx            # MODIFIED -- resolve getCurrentRole(), pass isAdmin to PageEditor
│                                         #   (page-editor.tsx is NOT rendered under /admin/content-pages/ --
│                                         #   that route (content-page-table.tsx) is list/create/delete only;
│                                         #   block editing happens inline on the real public page URL for a
│                                         #   moderator-or-higher session, per feature 021's own design)
└── lib/auth/require-role.ts             # Unchanged -- getCurrentRole() already exported, reused as-is

e2e/
├── admin-news.spec.ts                   # EXTENDED -- admin-only control-availability for the new controls
└── content-page.spec.ts                 # EXTENDED -- same, for the inline block editor (not admin-content-pages.spec.ts)

.env.example                             # MODIFIED -- document AI_GATEWAY_API_KEY
```

**Structure Decision**: No new route, page, or project. A small new `src/lib/ai/` module (this project's first) holds the shared Gateway wiring; three new Server Actions follow the existing `src/lib/actions/` naming/shape convention; both editor components get additive UI, not a rewrite.
