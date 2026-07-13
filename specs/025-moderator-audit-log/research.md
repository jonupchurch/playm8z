# Phase 0 Research: Moderator audit log

## 1. Category badge shows the real 4-value `category`, not a fabricated 11-way classifier

**Decision**: the per-entry badge displays `auditEntries.category`
(`moderation`\|`content`\|`access`\|`system`), capitalized — four
colors, matching the wireframe's own filter chips exactly.

**Rationale**: the wireframe's richer 11-value badge scheme (Removal,
Ban, Warning, ...) has no backing structured column — building it
would mean pattern-matching free-text `action` strings, a fragile,
purely-cosmetic classifier this project has consistently declined to
invent elsewhere (e.g., dropped "level," corrected non-canonical
reason-flavor labels). The real `category` is exactly what the
filter chips already operate on, so displaying it directly keeps the
badge and the filter semantically identical.

**Alternatives considered**: a keyword-matching classifier deriving a
finer label from `action` text — rejected as exactly the kind of
fabricated-precision this project avoids; adding a real, stored
sub-category column — rejected as unnecessary schema growth for a
purely cosmetic distinction no other feature needs.

## 2. Closing the `logAuditEntry()` gap in Admin News and Admin Content Pages

**Decision**: `020`'s `save-news-post.ts` (publish/schedule/update)
and `021`'s `create-content-page.ts`/`toggle-page-status.ts`/
`delete-content-page.ts` each gain a `logAuditEntry()` call
(`category = 'content'`).

**Rationale**: `015`'s own spec named "Admin Users/Postings/Forum/
News" as its anticipated real callers, and by the same logic Content
Pages (a CMS-shaped admin feature exactly like News) should log too —
neither ever did. The wireframe's own seed data assumes both exist
("published news," "edited content page"), so this feature's own
usefulness depends on the gap being closed, the same reasoning that
already justified two prior audit-logging gap-fixes (`017` becoming
`015`'s first real writer; `018` fixing `016`'s missing calls).

**Alternatives considered**: leaving the gap and shipping a viewer
with less real content-category data — rejected; the gap was found
during this feature's own design and costs little to close, the same
discipline applied every other time such a gap has surfaced.

## 3. Dropping the hashed-IP meta example

**Decision**: no IP address capture is added anywhere; the wireframe's
"IP: ...(hashed)" meta row is simply not reproduced.

**Rationale**: no feature in this project captures request IP
addresses today — adding it now would be new, privacy-sensitive data
collection this feature was never asked to introduce, solely to match
one decorative meta-row example. `meta`'s shape is already
writer-defined per `015`'s own design, so omitting this one example
key doesn't reduce any other writer's ability to include whatever
detail it already captures.

**Alternatives considered**: adding IP capture+hashing to every
Server Action platform-wide — rejected as significant, unrequested
new scope with real privacy/compliance surface area, far beyond "view
the existing audit trail."

## 4. Day grouping: Today / Yesterday / Earlier

**Decision**: entries group into Today, Yesterday, and a catch-all
Earlier bucket (extending Notifications', `012`, own Today/Earlier
convention with one more level, since this log is expected to be
browsed further back).

**Rationale**: an audit log is exactly the kind of view an admin
might need to search back weeks or months (e.g., investigating a
pattern) — a bare Today/Earlier split would dump everything more than
a day old into one undifferentiated bucket; Yesterday is a cheap,
useful intermediate grouping.

**Alternatives considered**: grouping by exact calendar date
indefinitely (a new heading per day, forever) — rejected as overkill
for a filterable, paginated list where search/filters are the real
navigation tool, not date-heading scrolling.

## 5. CSV export mirrors the current filter exactly

**Decision**: "Export CSV" re-runs `get-audit-log.ts`'s same
query with the same active `search`/`actor`/`category` `searchParams`
(unpaginated, capped at a reasonable maximum row count), serializing
the full matching result set to CSV.

**Rationale**: "what you see is what you export" is the least
surprising behavior — an admin who filtered down to one actor's
removals shouldn't get every entry in the table back in their
download.

**Alternatives considered**: always exporting the entire unfiltered
table — rejected, surprising and potentially much larger than what
the admin actually wanted; a separate export-specific filter UI —
rejected as needless duplication of controls already on the page.

## 6. Search/filter/pagination pattern

**Decision**: `get-audit-log.ts` takes validated `searchParams`
(`q`, `actor`, `category`, `page`) and runs a real, paginated Drizzle
query — Browse's/Forum index's/Admin Reports' already-settled
pattern.

**Rationale**: `auditEntries` accumulates indefinitely (every
admin/moderation action, forever) — identical scaling reasoning
already established multiple times.

**Alternatives considered**: none new.
