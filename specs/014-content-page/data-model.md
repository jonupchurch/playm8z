# Phase 1 Data Model: Content Page

## ContentPage (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `slug` | text, not null, unique | |
| `title` | text, not null | |
| `blocks` | jsonb, not null, default `[]` | Ordered array of typed block objects (below). |
| `status` | text, not null, default `draft` | `published` \| `draft`. |
| `updatedAt` | timestamp, not null, default now | Updated on every save. |

No soft-delete concern surfaces directly in this feature's own scope
— it never deletes a `ContentPage` row, only edits its content/status
(page deletion, if ever needed, is the future Admin Content Pages
feature's concern, and would follow ADR 0005 like everything else).

## Block shape (within the `blocks` JSONB array)

A discriminated union on `type`:

```text
{ type: "h2", text: string }
{ type: "p", text: string }
{ type: "list", items: string[] }
{ type: "quote", text: string }
{ type: "callout", text: string }
{ type: "divider" }
```

Array order is the rendering/reading order — no separate `order`
column, since the array's own position is the source of truth
(research.md #1).

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `title` | `z.string().trim().min(1).max(150)` |
| `blocks` | `z.array(blockSchema).max(100)`, where `blockSchema` is a `z.discriminatedUnion("type", [...])` matching the six shapes above, each with a reasonable per-field length cap (e.g. `text`/list items capped generously, matching other free-text fields in this project) |
| `status` | `z.enum(["published", "draft"])` |

## State notes

- `status` transitions `published` ⇄ `draft` freely, any number of
  times, only by a moderator-or-higher user (`toggle-page-status.ts`).
- `blocks`/`title` are replaced wholesale on every save
  (`save-content-page.ts`) — there's no partial-block-update path,
  consistent with research.md #3's batched-edit decision.
