# Implementation Plan: Moderator audit log

**Branch**: `025-moderator-audit-log` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-moderator-audit-log/spec.md`

## Summary

The `/admin/audit-log` viewer: a server-side, `searchParams`-driven,
day-grouped, searchable/filterable list over Admin Dashboard's
(`015`) existing `auditEntries` table, with expandable per-entry
detail and a filtered CSV export. Gated at moderator (not admin —
a read-only transparency tool, not a mutation surface). Includes
small, bounded retroactive amendments so Admin News (`020`) and
Admin Content Pages (`021`) — the two admin features that never
wired `logAuditEntry()` — finally do.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — no schema change; reads
`015`'s existing `auditEntries` table.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; standard
paginated/filtered query pattern (Browse's/Admin Reports' precedent),
since `auditEntries` accumulates indefinitely.

**Constraints**: Zod validation (Principle II) for the `searchParams`
(search/actor/category/page) boundary. `require-role.ts` gates the
route at moderator minimum — deliberately less strict than Admin
Settings (`024`), since this is read-only. CSV export re-applies the
same server-side filter as the page view, never a client-side dump of
unfiltered data. WCAG 2.1 AA (Principle III): each entry's
expand/collapse is a real, keyboard-operable disclosure with
`aria-expanded`, not a bare click handler.

**Scale/Scope**: 0 schema changes (read-only), 1 gated route, 1 query
function (`get-audit-log.ts`), 1 CSV-export path, and small bounded
amendments to `020`'s `save-news-post.ts` and `021`'s
`create-content-page.ts`/`toggle-page-status.ts`/
`delete-content-page.ts`, each adding a `logAuditEntry()` call.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed — reusing `015`'s existing table as a read-only consumer, and closing `020`'s/`021`'s missing `logAuditEntry()` gap, are both direct continuations of already-established, already-anticipated work. |
| II. Validated Trust Boundaries | PASS, with action: `require-role.ts` gates the route; `searchParams` are Zod-validated before reaching the query, same discipline as every prior list feature. |
| III. Designed, Accessible Experience | PASS, with action: expand/collapse is a real disclosure (`aria-expanded`, keyboard-operable); category badges carry a text label, not color-only; axe-core scan in e2e. |
| IV. Scope Discipline | PASS. The category badge is simplified to the real 4-value `category` rather than a fabricated 11-way classifier; the hashed-IP meta example is dropped rather than building new IP-capture infrastructure; no backfill of history predating each writer's own `logAuditEntry()` adoption. |
| V. Test Discipline | PASS, with action: unit tests for the search/filter/day-grouping query logic and the CSV-export filtering; integration tests for the two retroactive `logAuditEntry()` amendments and the role-gate rejection; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/025-moderator-audit-log/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — the CSV export is a Server Action/route handler,
not a public API; consistent with every feature since Post a Game.

### Source Code (repository root)

```text
src/
├── app/
│   └── admin/
│       └── audit-log/
│           └── page.tsx                # new — require-role.ts gate
│                                       # (moderator minimum), reads
│                                       # `searchParams`
├── components/
│   └── admin/
│       └── audit-log-list.tsx          # new — search bar, actor/
│                                       # category filters, day
│                                       # groups, expandable rows,
│                                       # Export CSV button
├── db/
│   └── schema.ts                       # unchanged — reads `015`'s
│                                       # existing `auditEntries`
└── lib/
    ├── validations/
    │   └── audit-log.ts                 # new — Zod schemas for
    │                                   # `searchParams`
    └── admin/
        ├── get-audit-log.ts             # new — search/filter/
        │                               # day-grouped, paginated query
        └── export-audit-log-csv.ts      # new — same filter, CSV
                                        # serialization

# Small, bounded amendments (research.md #2):
# src/lib/actions/save-news-post.ts (020-admin-news) — calls
# logAuditEntry() (category='content') on publish/schedule/update
# src/lib/actions/create-content-page.ts,
# src/lib/actions/toggle-page-status.ts, and
# src/lib/actions/delete-content-page.ts (021-admin-content-pages) —
# each call logAuditEntry() (category='content')

tests/ (colocated, per existing convention)
├── src/lib/validations/audit-log.test.ts            # new
├── src/lib/admin/get-audit-log.test.ts              # new
├── src/lib/admin/export-audit-log-csv.test.ts       # new
├── src/lib/actions/save-news-post.test.ts           # extended (020)
├── src/lib/actions/create-content-page.test.ts      # extended (021)
├── src/lib/actions/toggle-page-status.test.ts       # extended (021, if a dedicated test file exists; otherwise covered inline)
├── src/lib/actions/delete-content-page.test.ts      # extended (021)
e2e/
└── audit-log.spec.ts                     # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002`) is imported directly.

## Complexity Tracking

*No violations — table intentionally empty.*
