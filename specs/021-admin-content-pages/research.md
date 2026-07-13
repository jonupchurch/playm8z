# Phase 0 Research: Admin Content Pages

## 1. Reusing `014`'s `toggle-page-status.ts` rather than a second action

**Decision**: Publish/Unpublish call `014`'s existing
`toggle-page-status.ts` directly; Delete calls a thin new
`delete-content-page.ts` that sets `status = 'draft'` unconditionally
(not a toggle, since Delete must always land on draft regardless of
current status).

**Rationale**: `014` already owns a correct, tested status-toggle
action — reimplementing it here would risk the exact kind of
divergence this project has repeatedly guarded against elsewhere
(Admin Reports delegating to `017`/`018` rather than reimplementing
posting/forum removal). Delete needs slightly different semantics
(force-to-draft, not toggle) so it's a distinct thin action rather
than a call to the toggle with a pre-check.

**Alternatives considered**: implementing Delete as "call toggle only
if currently published" — rejected, adds a conditional branch for no
benefit over a direct, unconditional status-set; a single merged
`set-page-status.ts` replacing `014`'s own toggle — rejected, would
mean amending `014`'s calling code (its own inline-edit UI) for no
functional gain, when this feature can just add its own small action
alongside it.

## 2. `system` — a new column, not a derived value

**Decision**: `contentPages.system` is a real, stored boolean column,
not computed.

**Rationale**: unlike "Flagged" (Admin Users) or severity (the
moderation cluster), "is this a core legal/structural page" has no
underlying data it could be derived from — it's a deliberate editorial
classification (About Us/Privacy/Terms are system pages because this
project says so, not because of any date, count, or relationship).
Storing it directly is the correct choice here, not a violation of the
"computed over stored" preference (that preference applies when a
value truly is derivable; this one isn't).

**Alternatives considered**: hardcoding the three system slugs as a
constant array checked at render time instead of a column — rejected,
brittle (a slug rename would silently break the check) and
semantically wrong (system-ness is a property of the page, not an
accident of its current slug).

## 3. Seeding the three system pages now

**Decision**: this feature's Foundational phase includes a one-time
data seed (via migration or a seed script) inserting About Us, Privacy
Policy, and Terms of Use as real `ContentPage` rows (`system = true`,
`status = published`, minimal placeholder `blocks`).

**Rationale**: `014`'s own spec explicitly left page creation/deletion
as a future concern, and no feature before this one has ever written a
`ContentPage` row — without a seed, a fresh deployment would launch
with zero legal pages, which isn't acceptable for a real site (Privacy
Policy/Terms are expected to exist from day one, not as an admin's
first manual to-do item).

**Alternatives considered**: leaving the three system pages to be
created manually by an admin via "+ New page" post-launch — rejected,
these are structural expectations of any real site, not
editorially-optional content the way a "Careers" or "Help" page is.

## 4. Unique slug generation for "+ New page"

**Decision**: `create-content-page.ts` generates `/untitled-page`,
appending an incrementing numeric suffix (`/untitled-page-2`, `-3`,
...) if the base slug is already taken, checked against `014`'s
existing unique `slug` constraint.

**Rationale**: matches the wireframe's own intent (a guaranteed-unique
starting point requiring no admin input) while producing a
human-legible slug rather than a random string — an admin renaming the
page later (via `014`'s own inline-edit) naturally updates the slug's
meaning too.

**Alternatives considered**: a random/UUID-suffixed slug — rejected,
uglier and less legible for a field a human will likely want to
customize immediately after creation; relying on the database's
unique constraint to simply reject a collision and surface an error —
rejected, would turn an extremely common "click + New" action into an
occasional confusing failure for no benefit over just resolving it
automatically.

## 5. Search/filter pattern

**Decision**: `search-content-pages.ts` fetches all `ContentPage` rows
and filters by title/slug text and status/system in application code
— the same small-bounded-list pattern already used for Admin News
(`020`), not Browse's server-side-paginated pattern.

**Rationale**: the number of static pages a site has is inherently
small (tens, not thousands) — proportionate to fetch-all-then-filter
rather than build pagination infrastructure this list will never
need.

**Alternatives considered**: the full `searchParams`-paginated pattern
— rejected as disproportionate for this list's realistic scale.
