# Phase 1 Data Model: Admin Content Pages

## ContentPage (extends `014-content-page`'s existing table)

| Field | Type | Notes |
|---|---|---|
| `system` | boolean, not null, default `false` | New. Marks About Us/Privacy Policy/Terms of Use. Gates whether Delete is offered (never for `system = true`); does not restrict Publish/Unpublish. |

Reused unchanged from `014`: `id`, `slug`, `title`, `blocks`,
`status`, `updatedAt`. `status`'s existing `published`/`draft` enum is
reused as-is — "Delete" here is a plain `status = 'draft'` write, not
a new value.

## Seed data (this feature's Foundational phase — research.md #3)

Three rows inserted once (via migration or seed script):

| `title` | `slug` | `system` | `status` |
|---|---|---|---|
| About Us | `/about` | `true` | `published` |
| Privacy Policy | `/privacy` | `true` | `published` |
| Terms of Use | `/terms` | `true` | `published` |

Minimal placeholder `blocks` (e.g. a single `p` block noting the page
is a starting point) — real copy is expected to be filled in via
`014`'s own inline-edit UI afterward.

## Validation rules (Zod, at the Server Action/`searchParams` boundary — Principle II)

| Field | Rule |
|---|---|
| `q` (search) | `z.string().max(200).optional()` |
| `filter` | `z.enum(["all", "published", "draft", "system"]).default("all")` |
| `pageId` (delete) | `z.string().uuid()` |

`create-content-page.ts` takes no external input — it's a fixed
"Untitled page" draft with a server-generated slug (research.md #4),
so no Zod schema is needed beyond the acting session's own role.

## State notes

- `system` is set once, at insert time (only this feature's seed data
  and, implicitly, `false` for every page created via "+ New page")
  and never changed by any Server Action — there's no "promote to
  system" affordance.
- `status` continues to transition `published` ⇄ `draft` exactly as
  `014` already defined; this feature's Delete action is just another
  caller setting it to `draft`, unconditionally.
- No new soft-delete concern — `system`'s only effect is gating the
  Delete affordance in the UI/Server Action, not altering ADR 0005's
  existing `status`-based soft-hide mechanism.
