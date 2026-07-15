# Implementation Plan: Real Image Upload for News Post Covers

**Branch**: `029-news-cover-image-upload` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-news-cover-image-upload/spec.md`

## Summary

Add a real image-upload alternative to the Admin News editor's four gradient Cover swatches, storing the file in Vercel Blob (ADR 0008) and reusing the existing `newsPosts.cover` text column for the resulting URL — no schema change. A shared render helper distinguishes a gradient from a real image by string shape and is adopted by all 6 existing consumers, so every surface that already shows a News post's cover keeps working, with zero visual change for posts that only ever used a gradient.

## Technical Context

**Language/Version**: TypeScript (strict mode), Next.js App Router — no change from the constitution's Technology Constraints.

**Primary Dependencies**: `@vercel/blob` (new). No Zod schema for the upload itself (research.md #3 — plain file-type/size checks).

**Storage**: Vercel Blob for the uploaded file (ADR 0008); no schema/migration change to Postgres — `newsPosts.cover` is reused as-is.

**Testing**: Vitest for `upload-news-cover-image.ts`'s real logic (`@vercel/blob`'s `put()` mocked, no real network write in automated tests). Playwright e2e for the upload control's presence/gating only (research.md #5) — not a full real-upload round trip, to avoid adding a new secret to `.github/workflows/ci.yml` for what this feature needs to prove. One real, live upload is verified manually during implementation instead.

**Target Platform**: Web (existing Next.js app on Vercel) — requires a Vercel Blob store to be provisioned (research.md #1/#6), not yet done.

**Project Type**: Single Next.js web application (existing repo, no new project).

**Performance Goals**: SC-001's "under 10 seconds" for an upload+preview — bounded by the file size cap (5MB) and Blob's own upload speed, no additional engineering needed.

**Constraints**: FR-005 — zero visual regression for any already-published post that has only ever used a gradient cover.

**Scale/Scope**: One new Server Action, one new shared render helper, one small UI addition to the Cover section of `news-post-editor.tsx`, and six existing render call-sites switched to the shared helper. No new page, route, or schema.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development & Legible Architecture**: Satisfied by this spec/plan. The storage-choice tradeoff (Vercel Blob vs. storing bytes in Postgres) is a real, non-trivial decision — recorded as [ADR 0008](../../docs/adr/0008-news-cover-images-via-vercel-blob.md).
- **II. Validated Trust Boundaries**: The uploaded file is validated (type allow-list, size cap) before it's ever sent to Blob (research.md #3) — the first user-uploaded-file trust boundary in this project, treated with the same "validate before use" discipline as every other boundary, via plain checks rather than forcing an unfamiliar Zod-on-File pattern.
- **III. Designed, Accessible Experience**: The upload control MUST reuse the Cover section's existing visual language, MUST have a real accessible name/label (a file input needs a proper `<label>`, not a bare unlabeled control), MUST show a clear in-progress state while uploading, and MUST leave the existing cover preview untouched on a rejected/failed upload (FR-008).
- **IV. Scope Discipline (NON-NEGOTIABLE)**: Frozen to spec.md's boundaries — no crop/edit tool, no cleanup-on-replace, no expansion to avatars or any other color-swatch surface. Any adjacent idea goes to `docs/future-work.md`.
- **V. Test Discipline**: Vitest covers the Server Action's real logic with `put()` mocked; e2e covers gate/control-presence only (research.md #5) — the same split established by feature 028 for an external-call boundary Playwright can't intercept, applied here to avoid a CI secret/pipeline change out of proportion to this feature.
- **VI. Legible History**: One (or a small number of) atomic `feat:` commit(s); `CHANGELOG.md`/`status.md`/`docs/feature-list.md` updated (entry 29); ADR 0008 already written alongside this plan.

No violations — Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/029-news-cover-image-upload/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output (validation guide)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by this command)
```

No `data-model.md` and no `contracts/` — no new persisted entity (research.md #4), and Server Actions are this project's established internal-RPC pattern with no prior precedent of a `contracts/` folder for them.

### Source Code (repository root)

Single existing Next.js project (`src/` layout, `@/*` alias) — no new project.

```text
src/
├── lib/actions/
│   └── upload-news-cover-image.ts       # NEW -- validates + puts() to Vercel Blob, returns the public URL
├── lib/news/
│   └── cover-style.ts                   # NEW -- shared newsCoverStyle(cover, fallbackGradient) render helper
├── components/admin/
│   └── news-post-editor.tsx             # MODIFIED -- add the upload control to the Cover section; adopt the helper
├── components/news/
│   ├── news-post-card.tsx               # MODIFIED -- adopt newsCoverStyle
│   ├── featured-post.tsx                # MODIFIED -- adopt newsCoverStyle
│   └── article-related.tsx              # MODIFIED -- adopt newsCoverStyle
├── app/news/[slug]/page.tsx             # MODIFIED -- adopt newsCoverStyle (article detail)
├── app/profile/saved/page.tsx           # MODIFIED -- adopt newsCoverStyle (Saved tab)
└── components/admin/
    └── news-post-list.tsx               # MODIFIED -- adopt newsCoverStyle (admin list thumbnail)

.env.example                             # MODIFIED -- document BLOB_READ_WRITE_TOKEN
```

**Structure Decision**: No new route, page, project, or schema/migration. One new Server Action, one new shared render helper (a real DRY consolidation forced by FR-005 anyway, since 6 call-sites currently duplicate the same inline style logic), and additive UI in the Cover section.
