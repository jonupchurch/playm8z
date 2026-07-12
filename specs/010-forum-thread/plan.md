# Implementation Plan: Forum Thread

**Branch**: `010-forum-thread` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-forum-thread/spec.md`

## Summary

The single-thread view at `/forum/thread/[id]`, public to read.
Introduces `forumReplies`, `likes`, and `threadSubscriptions` (this
feature's own), and becomes the second writer of Blocked Users'
`reports` table (`targetType = forum`). Reply/like/report/subscribe
are all Server Actions gated the same way as every write action since
Auth & Onboarding.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — three new tables
(`forumReplies`, `likes`, `threadSubscriptions`) plus writes into the
existing `reports` table from `008-blocked-users` (data-model.md).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; standard
Server Action + re-render pattern throughout.

**Constraints**: Zod validation (Principle II) for reply/quote text and
every Server Action's input. A like toggle must be safe under a race
(two rapid clicks) — enforced via a unique constraint on
`(userId, targetType, targetId)` in `likes`, not just an application-
level check, so a duplicate can't slip through a race condition the
way a purely-in-code check might. WCAG 2.1 AA (Principle III): like/
reply/report controls need accessible names beyond a bare glyph
(the wireframe's "▲" needs a real "Like" accessible name), and reply
sort needs the same real selectable semantics as Browse's/Forum
index's facet controls.

**Scale/Scope**: 1 new route, 3 new tables, a `reports` write path
reused from Blocked Users, 4 Server Actions (reply, toggle-like,
report, toggle-subscription).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — reusing `reports` and dropping `isBestAnswer` are implementation-scoped decisions (research.md), consistent with established patterns. |
| II. Validated Trust Boundaries | PASS, with action: every Server Action's input is Zod-validated; the like-toggle's uniqueness is enforced at the database level, not just in application code. |
| III. Designed, Accessible Experience | PASS, with action: accessible names for glyph-only controls (like, quote), real selectable semantics for reply sort, axe-core scan. |
| IV. Scope Discipline | PASS. Thread creation, pinning/locking, and any real notification delivery from Subscribe are explicitly excluded and logged, not half-built. |
| V. Test Discipline | PASS, with action: unit tests for the Zod schemas; integration tests for reply/like/report/subscribe (including the unverified-user gate and the duplicate-like rejection); e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/010-forum-thread/
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
│   └── forum/
│       └── thread/
│           └── [id]/
│               └── page.tsx            # new — public; increments
│                                       # view count, renders OP,
│                                       # replies, composer, right rail
├── components/
│   └── forum/
│       ├── original-post.tsx           # new
│       ├── reply-card.tsx              # new — like, Quote, Report
│       ├── reply-composer.tsx          # new — incl. quoted-reply
│       │                               # preview when quoting
│       └── thread-right-rail.tsx       # new — info + related threads
│                                       # + the static guidelines
│                                       # callout
├── db/
│   └── schema.ts                       # extended: new
│                                       # `forumReplies`, `likes`,
│                                       # `threadSubscriptions` tables
│                                       # (data-model.md)
└── lib/
    ├── actions/
    │   ├── post-reply.ts               # new — Server Action
    │   ├── toggle-like.ts              # new — Server Action
    │   ├── report-forum-content.ts     # new — Server Action, writes
    │   │                               # into `008`'s `reports` table
    │   └── toggle-subscription.ts      # new — Server Action
    ├── validations/
    │   └── forum-thread.ts              # new — Zod schemas
    └── forum/
        ├── get-thread.ts                 # new — thread + OP + replies
        │                                # + related threads
        └── increment-view-count.ts       # new
tests/ (colocated, per existing convention)
├── src/lib/validations/forum-thread.test.ts         # new
├── src/lib/actions/post-reply.test.ts               # new
├── src/lib/actions/toggle-like.test.ts              # new
├── src/lib/actions/report-forum-content.test.ts     # new
e2e/
└── forum-thread.spec.ts                 # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `report-forum-content.ts` writes into the `reports` table
`008-blocked-users` already defined — no new Report schema here, only
a new writer.

## Complexity Tracking

*No violations — table intentionally empty.*
