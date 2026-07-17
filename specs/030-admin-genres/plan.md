# Implementation Plan: Admin-editable Genres

**Branch**: `030-admin-genres` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-admin-genres/spec.md`

## Summary

Move the genre list out of a hardcoded const and into the existing `settings` singleton, edited from a
new **Lists** tab in Admin → Settings using the same add/remove chip pattern `bannedPhrases` already
uses. The list stays the single source for the post-a-game screen, the Browse filter, and the landing
genre counts (FR-005/FR-006). The real work is not the admin UI — it is that `z.enum(GENRES)` cannot
express a runtime list, so Zod keeps validating shape while *membership* is checked where the value is
used (research.md #3), strictly for arriving values and tolerantly for values already stored
(research.md #4).

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router — no change from the constitution's
Technology Constraints.

**Primary Dependencies**: None new. Zod, Drizzle, and the existing settings read/write helpers.

**Storage**: One additive column, `settings.genres text[] NOT NULL DEFAULT {…eight current genres}`.
No change to `postings.genre` (already plain nullable text — no enum, no FK, so nothing constrains an
existing value when the list changes, which is what makes FR-007 free rather than hard).

**Testing**: Vitest for the new save action (validation rules FR-010/FR-011, admin-only gate FR-012,
audit entry FR-013) and for the membership rules in `create-posting`/`manage-posting` (FR-008 and the
tolerance rule — the retired-genre re-save is the one that matters). Playwright e2e for the round
trip that is the actual user promise: add a genre as admin → it appears on both post-a-game and
Browse (SC-003); remove it → gone from both, existing posting intact (SC-004).

**Target Platform**: Web (existing Next.js app on Vercel).

**Project Type**: Single Next.js web application (existing repo).

**Performance Goals**: SC-002 ("visible within seconds"). Met by the existing 5-second settings TTL
cache (research.md #7) — no new work, and the number in SC-002 is deliberately that cache's shape.

**Constraints**: FR-007 — no existing posting may be modified, ever. This feature writes to exactly
one table (`settings`) and never to `postings`.

**Scale/Scope**: One column, one save action, one settings tab, two validation boundaries adjusted,
two client components fed by prop instead of import, one landing-stats source swap. No new page, no
new route, no new nav entry.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development & Legible Architecture**: Satisfied by this spec/plan. The one
  non-obvious decision — moving the genre membership test out of Zod — is argued explicitly in
  research.md #3 rather than left for a reader to reverse-engineer. No ADR: this changes no ratified
  decision. ADR 0001 (games are free-text keywords, no catalog) is untouched — genres were always the
  curated exception, and this feature changes *who* curates them, not whether they are curated.
- **II. Validated Trust Boundaries**: Both boundaries keep parsing visitor input through Zod. The
  membership check moves out of the enum by necessity (a runtime list cannot be a static enum) and is
  reasoned through in research.md #3 against this principle specifically, including why the
  safety-critical property (visitor string → SQL `WHERE`) is unaffected. This is the plan's one
  judgement call and is flagged as such rather than buried.
- **III. Designed, Accessible Experience**: The Lists tab reuses the Moderation tab's existing chip
  UI, so it inherits its visual language for free. New controls need real accessible names (an
  add-genre input needs a real label, remove buttons need names that say *which* genre they remove —
  eight identically-named "Remove" buttons is the failure mode). `text-dim` on an accent-tinted
  background fails contrast here; default to `text-muted`.
- **IV. Scope Discipline (NON-NEGOTIABLE)**: Frozen to spec.md. No per-genre metadata, no renaming, no
  reordering, no backfill of existing postings. The live temptation is "while we're here, migrate
  postings that use retired genres" — explicitly forbidden by FR-007.
- **V. Test Discipline**: Vitest for the action's real logic against a real database; e2e for the
  cross-screen promise, which is the one thing unit tests structurally cannot prove (SC-003 is
  *about* two screens agreeing). Tests that touch `settings` MUST restore every field they change in
  `afterAll`/`finally` — it is a shared singleton row and cross-file corruption via it is a real
  observed risk in this project, not a hypothetical.
- **VI. Legible History**: Atomic `feat:` commit(s) on this branch; `CHANGELOG.md`, `status.md`, and
  `docs/feature-list.md` updated (entry 30).

No violations — Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/030-admin-genres/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (validation guide)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by this command)
```

No `contracts/` — Server Actions are this project's established internal-RPC pattern and no prior
feature has used a contracts folder for them.

### Source Code (repository root)

Single existing Next.js project (`src/` layout, `@/*` alias).

```text
src/
├── db/schema.ts                                  # MODIFIED -- settings.genres text[] NOT NULL DEFAULT
├── lib/validations/
│   ├── browse-filters.ts                         # MODIFIED -- GENRES -> DEFAULT_GENRES (seed only);
│   │                                             #             genres facet becomes z.array(z.string())
│   ├── posting.ts                                # MODIFIED -- genre becomes a shape-checked string
│   └── admin-settings.ts                         # MODIFIED -- saveListsSettingsSchema (non-empty,
│                                                 #             no blanks, case-insensitive unique)
├── lib/settings/get-settings.ts                  # MODIFIED -- read + validate the new field
├── lib/actions/
│   ├── save-lists-settings.ts                    # NEW -- requireRole(admin) -> parse -> upsertSettings
│   │                                             #        -> logAuditEntry -> revalidatePath
│   ├── create-posting.ts                         # MODIFIED -- reject a genre not in the stored list
│   └── manage-posting.ts                         # MODIFIED -- same, but allow the value already stored
├── lib/landing/get-landing-stats.ts              # MODIFIED -- count over the stored list (FR-006)
├── components/admin/
│   ├── settings-lists.tsx                        # NEW -- the Lists tab's chip editor
│   └── (settings tab host)                       # MODIFIED -- register the Lists tab
├── components/browse/filter-sidebar.tsx          # MODIFIED -- genres arrive as a prop
├── components/post-game/post-game-form.tsx       # MODIFIED -- genres arrive as a prop
├── app/browse/page.tsx                           # MODIFIED -- read list; intersect filter (research #5)
├── app/post/page.tsx                             # MODIFIED -- read list; pass to the form
└── app/admin/settings/page.tsx                   # MODIFIED -- render the Lists tab
```

**Structure Decision**: No new page, route, project, or table. One additive column and one new Server
Action, following the settings chain unchanged. The two client components receive the list as a prop
from their server parents rather than importing it — a client component importing a runtime value
from a module that reaches `@/db` crashes the page, a mistake this project has already made and fixed
once (research.md #9).

## Complexity Tracking

Not required — no constitution violations.
