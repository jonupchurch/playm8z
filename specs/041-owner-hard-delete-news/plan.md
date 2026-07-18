# Implementation Plan: Owner-only permanent delete for news posts

**Branch**: `041-owner-hard-delete-news` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/041-owner-hard-delete-news/spec.md`

## Summary

Add an **owner** marker to accounts (a boolean flag, orthogonal to the moderation
role), gate a new owner-only **permanent delete** of a news post on it, and
relabel the misleading soft-delete button "Delete" → "Unpublish". The owner keeps
their `admin` role, so no existing role check changes — the flag is the only new
authorization signal. The permanent delete really removes the row (cascading to
its likes/saves), is verified owner-only on the server, requires a confirm, and
is audit-logged. This is a narrow, documented exception to ADR 0005 (no hard
deletes): owner only, news posts only, always audited.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router (repo-pinned).
**Primary Dependencies**: Drizzle ORM + postgres.js; Auth.js v5 (via existing
session helpers). No new dependencies.
**Storage**: PostgreSQL. One additive column `user.isOwner boolean not null
default false`. The permanent delete removes a `newsPosts` row (the only FK to it
— the news likes/saves table — is `onDelete: cascade`, so no orphans).
**Testing**: Vitest (unit/integration for the owner check, the delete action, and
the editor component) + existing Playwright. `fileParallelism:false`.
**Project Type**: Web application (single Next.js app, `src/` layout, `@/*`).
**Constraints**: The owner check is a server-side trust boundary (Principle II) —
never trust a client's claim to be owner. The soft "Unpublish" behavior is
unchanged. No role-hierarchy change, so no ripple to existing `role === "admin"`
checks.
**Scale/Scope**: 1 additive column, 1 owner helper, 1 delete action, 1 editor
relabel + 1 owner-only confirm-gated button, 1 idempotent provisioning script,
1 ADR. Two user stories (P1 delete, P2 relabel).

## Constitution Check

*GATE: pass before Phase 0; re-check after Phase 1.*

- **I. Spec-Driven & Legible Architecture** — PASS. spec/plan/tasks committed;
  ADR 0014 records the owner marker + the scoped ADR-0005 exception.
- **II. Validated Trust Boundaries** — PASS, central. The permanent-delete action
  validates its input with Zod and re-checks the owner marker **server-side**
  from the DB (never from client state) before deleting. A non-owner request is
  refused. Destructive + irreversible, so also gated behind an explicit confirm.
- **III. Designed, Accessible Experience** — PASS. Reuses the existing editor
  footer; the new control matches the existing danger-button styling and adds an
  inline two-step confirm (no new page/route). Relabel is copy-only.
- **IV. Scope Discipline** — PASS. News posts only; owner not UI-assignable; no
  restore/trash. Extensions (other content types, an ownership-transfer UI, a
  visible owner badge) are logged to future-work.
- **V. Test Discipline** — PASS. The owner helper, the delete action (owner
  succeeds + cascade + audit; non-owner refused; missing post graceful), and the
  editor (relabel; owner-only button visibility; confirm step) are all tested.
- **VI. Legible History** — PASS. Conventional Commits; CHANGELOG/status; ADR
  committed with the code; and — per the new standing workflow — a user-facing
  Patch Notes post to prod for the "Unpublish" relabel + any owner-facing note.

**No violations. Complexity Tracking not required.**

## Project Structure

```text
specs/041-owner-hard-delete-news/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/owner-and-delete.md
└── tasks.md            # /speckit-tasks

src/
├── db/schema.ts                              # EDIT: users.isOwner column
├── lib/
│   ├── auth/require-owner.ts                 # NEW: isCurrentUserOwner()
│   ├── actions/delete-news-post.ts           # NEW: deleteNewsPostPermanently()
│   ├── actions/delete-news-post.test.ts      # NEW
│   └── validations/admin-news.ts             # EDIT: permanentDeleteSchema (postId)
├── app/admin/news/page.tsx                   # EDIT: pass isOwner to editor
└── components/admin/
    ├── news-post-editor.tsx                  # EDIT: relabel + owner-only button
    └── news-post-editor.test.tsx             # NEW/EDIT
docs/adr/0014-owner-marker-and-scoped-hard-delete.md   # NEW
scripts/set-owner.ts                          # NEW: idempotent owner provisioning
```

**Structure Decision**: Single Next.js app, existing layout. The owner check
lives in its own `require-owner.ts` (server-only, reads the flag fresh by session
email — same idiom as `lookupRole`) rather than in `require-role.ts`, keeping the
role hierarchy file untouched. The delete is its own action, never overloading
`save-news-post.ts`'s soft-delete.

## Phase 0 — Research

See [research.md](./research.md): owner-as-flag vs role tier (and why the flag
removes the ripple), the server-side owner gate for an action (boolean-return, not
`forbidden()`), the cascade + audit-survives-delete facts, the confirm UX, and the
idempotent provisioning + additive migration approach.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the `isOwner` column, the delete + cascade,
  the audit entry.
- [contracts/owner-and-delete.md](./contracts/owner-and-delete.md) — `isCurrentUserOwner()`
  and `deleteNewsPostPermanently()` signatures + contracts.
- [quickstart.md](./quickstart.md) — manual validation.
- ADR [0014](../../docs/adr/0014-owner-marker-and-scoped-hard-delete.md).

## Post-Design Constitution Re-Check

Still PASS on all six. The one additive column and the server-side owner gate are
the only trust-boundary-relevant additions, both covered by Principle II and
tested. No role change ⇒ no regression surface beyond the new action + button.
