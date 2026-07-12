# Phase 0 Research: Content Page

## 1. Blocks as a JSONB column, not a normalized table

**Decision**: `contentPages.blocks` is a single JSONB column holding
the ordered array of typed block objects, not a separate
`content_blocks` table with a foreign key back to the page.

**Rationale**: every read and write in this feature's own scope touches
the entire array as one unit — viewing renders all of them in order,
and saving always replaces the whole array atomically (FR-006). A
normalized table would add join/ordering-column overhead for an access
pattern that never actually queries an individual block on its own.

**Alternatives considered**: a normalized `content_blocks` table
(`id`, `pageId`, `type`, `order`, `data`) — rejected as unnecessary
structure for data that's never read or written independently of the
full page; revisit only if a future feature needs to query/reference
an individual block directly (nothing currently does).

## 2. Reusing Error Pages' `require-role.ts` for the first time

**Decision**: both the page-load visibility check (is a draft visible
to this viewer?) and the save/publish Server Actions call
`002-error-pages`'s existing `require-role.ts` with a moderator
minimum, rather than a new role-check helper.

**Rationale**: that helper was built specifically as a ready-to-call
mechanism with no consumer yet (its own plan said so explicitly) — this
is exactly the kind of check it was designed for, and reusing it keeps
the 401/403 behavior consistent with whatever `/admin/*` pages
eventually do.

**Alternatives considered**: a bespoke "is moderator" check local to
this feature — rejected, duplicates a mechanism that already exists
for precisely this purpose.

## 3. Batched local-state editing, not per-field autosave

**Decision**: `page-editor.tsx` holds the entire draft (title + block
array) in Client Component state once edit mode is entered; every
add/remove/reorder/edit interaction mutates that local state only.
`save-content-page.ts` is called exactly once, on "Save changes," with
the complete resulting title + block array; "Cancel" simply discards
the local state and re-renders from the last-fetched (saved) data.

**Rationale**: matches the wireframe's own behavior exactly (a `saved`
flag that only flips on explicit save, an unaffected stored state until
then) and is simpler to reason about and test than autosaving each
keystroke or each individual block operation.

**Alternatives considered**: a Server Action per block operation
(add/remove/reorder each hitting the database immediately) — rejected,
doesn't match the wireframe's explicit Save/Cancel duality and would
make "Cancel" much harder to implement correctly (undoing several
already-persisted writes instead of just discarding unsaved local
state).

## 4. Draft pages are indistinguishable from missing slugs, publicly

**Decision**: the page route calls Next.js's `notFound()` (Error
Pages' 404 state) whenever a non-privileged visitor requests a slug
that's either genuinely absent or present-but-`draft` — no separate
"this page isn't published yet" message.

**Rationale**: avoids leaking the existence of unpublished content to
the public (the same "don't reveal more than you have to" reasoning
Error Pages already applied to unauthorized `/admin/*` routes), and
keeps the public-facing behavior simple: a page either is there to
read, or it isn't.

**Alternatives considered**: a distinct "coming soon" state for drafts
— rejected as unnecessary UX surface for content that isn't ready to
be public yet; simpler to treat it the same as "doesn't exist."
