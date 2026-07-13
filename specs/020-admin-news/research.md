# Phase 0 Research: Admin News

## 1. One save action, branching by requested action

**Decision**: a single `save-news-post.ts` Server Action takes the
draft fields plus a discriminated `action` (`publish` \| `schedule` \|
`save-draft` \| `delete`), and derives `status`/`publishedAt`/
`featured` from it:
- `publish`: `status = 'published'`, `publishedAt = now()` (only set
  to `now()` if not already published — see #5 for the Update case).
- `schedule`: `status = 'scheduled'`, `publishedAt` = the entered
  future date.
- `save-draft`: `status = 'draft'`, regardless of the status control's
  on-screen selection (FR-007).
- `delete`: `status = 'draft'` (the ADR-0005-safe "Unpublish").

**Rationale**: every one of the wireframe's five footer actions
(Publish now/Update/Schedule/Save draft/Delete) is really the same
row getting a different `status`/`publishedAt` combination — a single
action with a small discriminated union keeps this legible in one
place rather than five near-identical Server Actions.

**Alternatives considered**: five separate Server Actions — rejected,
would duplicate the same validation/role-check/DB-write scaffolding
five times for what's really one state-transition decision.

## 2. Reusing `013`'s `featured` for "pin," enforcing at-most-one

**Decision**: "Pin to top of feed" sets `newsPosts.featured = true` on
this row and `false` on whichever row previously had it — one
transaction, not two separate writes a race could interleave.

**Rationale**: `013`'s own data-model.md already named this exact
invariant as "the future Admin News feature's" responsibility — this
feature is that future feature. Reusing the column avoids a redundant
`pinned` field carrying the same meaning under a different name.

**Alternatives considered**: a separate `pinned` boolean distinct from
`featured` — rejected, no distinct meaning exists between them in this
project; `013`'s wording already anticipated exactly this reuse.

## 3. Scheduled publication is computed at read time

**Decision**: `013`'s `search-news.ts` is amended to include a post
when `status = 'published'`, OR `status = 'scheduled'` AND
`publishedAt <= now()`. No background job/cron ever flips a
`scheduled` row's stored `status` to `published`.

**Rationale**: same reasoning already applied to posting auto-expiry
(ADR 0003) — a "is this actually live right now" question is fully
answerable from existing columns at read time, so a scheduler job
would be unrequested infrastructure solving a problem the query
already solves.

**Alternatives considered**: a cron job (e.g. Vercel Cron) flipping
`scheduled` → `published` at the target time — rejected as
disproportionate; this project has consistently preferred a computed
read over background state mutation when the two produce identical
externally-visible behavior.

## 4. `body` is plain markdown, not a rich-text document

**Decision**: `newsPosts.body` is a plain `text` column holding
markdown; the editor's B/i/H2/link/list toolbar inserts markdown
snippets (`**`, `*`, `## `, `[]()`, `- `) at the textarea's cursor
position — a client-side text-manipulation convenience, not a
WYSIWYG editor or a stored rich-document structure.

**Rationale**: proportionate to what this feature actually needs
(an admin typing an announcement); a full rich-text editor is
meaningfully more infrastructure (a new dependency, a document
schema) for a feature whose own wireframe shows a plain `<textarea>`
underneath the toolbar. Content Page's (`014`) JSONB block structure
is a different, more structured entity (arbitrary page layout) and
isn't the right precedent to copy here.

**Alternatives considered**: a JSONB block structure mirroring
Content Page (`014`) — rejected, disproportionate for a single
scrolling announcement body; a full WYSIWYG library (e.g. TipTap) —
rejected as an unrequested new dependency for a five-button toolbar's
worth of formatting.

## 5. "Update" never resets `publishedAt`

**Decision**: `save-news-post.ts`'s `publish` action only sets
`publishedAt = now()` when the row's current `status` isn't already
`published` (i.e., a genuinely new publish, not an edit to an already-
published post) — an edit to a published post keeps its original
`publishedAt`.

**Rationale**: the wireframe's own primary-button label logic already
distinguishes "Publish now" (draft/new → published) from "Update"
(already published) — the underlying behavior (don't reset the
publish date on every edit) is the natural implication of that label
distinction, matching ordinary CMS/blog behavior.

**Alternatives considered**: always resetting `publishedAt` on save —
rejected, would make "Update" silently re-date and re-sort an already-
published post on the public feed every time an admin fixes a typo.

## 6. List/filter pattern

**Decision**: `get-news-posts.ts` is a small, unbounded query (this
feature's own admin list, not a paginated public one) returning every
`NewsPost` regardless of status, filtered client-/query-param-side to
All/Published/Drafts/Scheduled.

**Rationale**: an admin CMS's own post list is bounded by how much
content editors actually produce — nowhere near Browse's/Forum
index's unbounded-growth scale — so the simpler "fetch all, filter"
pattern (matching Home's, not Browse's, precedent) is proportionate
here.

**Alternatives considered**: the full server-side `searchParams`-
paginated pattern — rejected as disproportionate for an admin-only
content list of the size this project actually expects.
