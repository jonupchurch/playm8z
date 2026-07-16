# Implementation Plan: Posting age groups become demographic ranges

**Branch**: `032-posting-age-ranges` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/032-posting-age-ranges/spec.md`

## Summary

A posting's age group stops meaning "minimum age to join" and starts meaning "who this party is for":
`Any` (default) | `18-29` | `30-49` | `50+`. The 18+ and 21+ options go. This is postings only — a
player's own profile tag stays `18|21` and is deliberately untouched, so `ageGroup` legitimately means
two different things after this feature (research.md #6). No migration: existing postings keep their
old tags and expire within 30 days (ADR 0003). The work is a vocabulary swap across eight sites, a
label map to replace a `+`-concatenation that would otherwise render `50plus+` (research.md #2), and a
new ADR superseding half of ADR 0002 (research.md #8).

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router — no change from the constitution's
Technology Constraints.

**Primary Dependencies**: None new.

**Storage**: **No schema change and no migration.** `postings.ageGroup` is already `text NOT NULL`
(`src/db/schema.ts:172`) with no Postgres enum and no constraint, so the vocabulary lives entirely in
code. Its comment (`// 18|21 only (ADR 0002) -- never 13.`) must be updated or it becomes a lie.

**Testing**: Vitest for the two validation boundaries (the four new values accepted; legacy values
rejected on create but tolerated on edit — research.md #4) and for the label map, including the legacy
inputs. Playwright e2e for what unit tests structurally cannot catch: that the rendered label is
`50+` and not `50plus+` on a real page (SC-002), and that an old posting survives an unrelated edit
without being relabelled (US3 scenario 5).

**Target Platform**: Web (existing Next.js app on Vercel).

**Project Type**: Single Next.js web application (existing repo).

**Performance Goals**: None specific. No new query, no new read.

**Constraints**: FR-010 — no enforcement, ever. FR-011 — no existing posting may be relabelled,
including implicitly by a form control (research.md #5). FR-013 — the user's own age tag is untouched.

**Scale/Scope**: Two validation schemas, three UI controls, two display sites, one edit-path tolerance
rule, one new label map, one new ADR. No new page, route, table, column, or migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development & Legible Architecture**: Satisfied by this spec/plan. This feature
  changes a **ratified** decision, so it requires **ADR 0009** (research.md #8) superseding ADR 0002's
  Posting ruling only — with a pointer added *into* ADR 0002, because a reader who lands there first
  and acts on it will build the wrong thing. This is the deliverable most likely to be skipped as
  paperwork and is the one that keeps the codebase legible.
- **II. Validated Trust Boundaries**: Both boundaries keep validating with Zod, and both stay static
  `z.enum`s — unlike feature 030, this vocabulary is fixed in code, so nothing here forces the enum to
  become dynamic. The edit path gains a tolerance rule for the value already stored (research.md #4),
  which is a widening of what is accepted and is therefore reasoned explicitly rather than assumed:
  it accepts *exactly one* extra value, the one already in that row, and nothing else.
- **III. Designed, Accessible Experience**: The controls reuse the existing `Segment` pattern, so the
  visual language is inherited. Four segments where there were two/three — check the row still fits at
  mobile widths rather than assuming. The `<select>` on the edit card already has `aria-label="Age
  group"`; the legacy-value option (research.md #5) must read as a real, selectable label ("21+"), not
  a raw token.
- **IV. Scope Discipline (NON-NEGOTIABLE)**: Frozen to spec.md. Three live temptations, all
  forbidden: adding enforcement (FR-010 — the renaming makes it *sound* natural); "fixing" the user's
  own age tag to match the new vocabulary (FR-013 — they diverge on purpose); and migrating existing
  postings (spec Assumptions — self-limiting via ADR 0003's 30-day expiry, and `21` has no honest
  target).
- **V. Test Discipline**: Vitest for both boundaries and the label map; e2e for the rendered label and
  the old-posting-survives-an-edit path. The label map's legacy inputs (`18`, `21`) are the cases most
  likely to be dropped from the tests and most likely to regress, since they have no UI that produces
  them any more.
- **VI. Legible History**: Atomic `feat:` commit(s); ADR 0009 committed alongside; `CHANGELOG.md`,
  `status.md`, and `docs/feature-list.md` updated (entry 32).

No violations — Complexity Tracking table is not needed. (ADR 0009 is not a violation; it is
Principle I working as designed.)

## Project Structure

### Documentation (this feature)

```text
specs/032-posting-age-ranges/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (validation guide)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by this command)

docs/adr/0009-posting-age-group-is-a-demographic-range.md   # NEW -- supersedes ADR 0002 (Posting half)
docs/adr/0002-minimum-age-18-plus.md                        # MODIFIED -- pointer to 0009
```

No `contracts/` — Server Actions are this project's established internal-RPC pattern.

### Source Code (repository root)

Single existing Next.js project (`src/` layout, `@/*` alias).

```text
src/
├── db/schema.ts                                    # MODIFIED -- comment only (line 172's "18|21 only" is now false)
├── lib/validations/
│   ├── posting.ts                                  # MODIFIED -- ageGroup enum -> any|18-29|30-49|50plus, default "any"
│   └── browse-filters.ts                           # MODIFIED -- ageGroup filter enum -> the same four
├── lib/postings/
│   └── age-label.ts                                # NEW -- postingAgeLabel(): tokens + legacy 18/21 -> display text
├── lib/actions/manage-posting.ts                   # MODIFIED -- tolerate the value already stored (research #4)
├── components/post-game/post-game-form.tsx         # MODIFIED -- four Segments, default "any"
├── components/browse/filter-sidebar.tsx            # MODIFIED -- four Segments
├── components/browse/active-pills.tsx              # MODIFIED -- concat -> postingAgeLabel()
├── components/profile/posting-management-card.tsx  # MODIFIED -- new options + the legacy-option rule (research #5)
└── app/listing/[id]/page.tsx                       # MODIFIED -- concat -> postingAgeLabel()

UNTOUCHED, deliberately (FR-013) -- the user's own age tag:
  src/lib/validations/onboarding.ts, src/components/auth/onboarding-wizard.tsx,
  src/app/profile/page.tsx, src/app/u/[handle]/page.tsx, src/db/schema.ts:33
```

**Structure Decision**: No new page, route, table, column, or migration — `postings.ageGroup` is
already free text, so this is a code-only vocabulary change. The one new module is the label map,
which exists because age is currently rendered by appending `+` to the raw value: that silently
produces `50plus+` and `30-49+`, breaks nothing, and would ship unnoticed (research.md #2).

**No dependency on features 030/031.** This branch touches `postings`/`browse` validation and display;
030 and 031 touch `settings` and the admin tab. The only shared files are
`src/lib/validations/posting.ts` and `browse-filters.ts` — 030 edits their **genre** fields, this
edits their **ageGroup** fields. Different lines, but the same two files: whichever merges second
should expect a trivial textual conflict there and nothing more.

## Complexity Tracking

Not required — no constitution violations.
