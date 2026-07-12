# Phase 0 Research: Forum index

## 1. Categories as a hardcoded set, not a table

**Decision**: the six categories live as a `const` (key, label, dot
color) in `src/lib/forum/categories.ts`, not a database table.

**Rationale**: a small, fixed, non-user-editable set — the same
treatment this project already gives vibe, platform, and region enums.
A database table would need CRUD, seeding, and migration ceremony for
data that never changes at this project's current scope.

**Alternatives considered**: a `categories` table matching
`guidelines.md`'s literal suggested shape (`key, label, colorToken`) —
rejected as unnecessary ceremony for six values nothing lets a user or
admin edit (yet); revisit only if a future Admin Forum feature wants
to make categories admin-configurable.

## 2. Server-side, URL-driven filtering (Browse's pattern, not Home's)

**Decision**: `/forum`'s category/search/sort state lives in
`searchParams`, validated and used to build a real query in
`search-threads.ts` — not client-side filtering over an already-fetched
array.

**Rationale**: forum threads accumulate indefinitely (unlike Home's
deliberately-small recent slice); this is exactly the scaling argument
Browse's own research.md already made, reused here rather than
re-litigated.

**Alternatives considered**: none new — directly follows Browse's
already-settled precedent.

## 3. "HOT" is computed, not stored

**Decision**: a thread qualifies as "hot" at read time if it has an
above-average reply count relative to its age among currently-listed
threads (a simple, transparent ratio — not a stored flag, not a
scheduled job). "PINNED" stays a real stored column, since moderators
need to durably control it (the future Admin Forum feature owns
setting it; this feature only reads it).

**Rationale**: `guidelines.md` lists `hot` as a stored boolean without
describing what sets it — inventing a scheduled backend job to
maintain it would be real, unjustified scope for a decorative badge;
computing it on read gives the same visible behavior with none of that
infrastructure.

**Alternatives considered**: a stored `hot` column updated by a cron/
scheduled job — rejected, meaningful new infrastructure (a job runner)
for a cosmetic badge; a stored `hot` column set once at thread-creation
time and never updated — rejected, would go stale immediately and stop
meaning anything.

## 4. Reusing the modal-dialog pattern, not the component

**Decision**: `new-thread-modal.tsx` follows the same accessibility
approach Blocked Users' `block-modal.tsx` established (focus trap,
`role="dialog"`, `aria-labelledby`, Escape-to-close, focus restoration)
but is its own component — different fields (category select, title,
body, tags vs. a user-search picker), so there's nothing to share by
direct reuse, only the interaction pattern.

**Rationale**: this project's first modal was Blocked Users'; rather
than re-deriving dialog accessibility from scratch, this feature
follows the same now-established approach — consistent UX and less
risk of a second, subtly-different modal pattern emerging.

**Alternatives considered**: a full dedicated `/forum/new` page instead
of a modal — rejected, more page-navigation ceremony than a four-field
compose form needs, and the wireframe itself frames it as a modal.
