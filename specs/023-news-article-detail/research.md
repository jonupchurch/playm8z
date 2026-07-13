# Phase 0 Research: News Article detail

## 1. Markdown rendering

**Decision**: use a small, well-established markdown-to-HTML library
(e.g. the same class as `marked`/`remark`) to render `NewsPost.body`
(plain markdown, per Admin News' `020` own decision) for display.

**Rationale**: Admin News' own research already decided `body` is
plain markdown specifically so this feature could render it simply —
a small, focused rendering library is proportionate; this project has
consistently avoided heavier solutions (no CMS block-renderer, no
custom parser) where an established library does the job.

**Alternatives considered**: writing a custom minimal markdown
subset parser — rejected, reinventing a solved problem for no
benefit; rendering raw markdown as preformatted text — rejected,
defeats the purpose of the formatting toolbar `020` already built.

## 2. Adding the missing `newsPosts.slug`

**Decision**: `newsPosts` gains `slug` (unique, not null). Admin
News' (`020`) `save-news-post.ts` is amended to generate one from the
title at creation time only (never regenerated on edit), using the
same numeric-suffix collision approach Admin Content Pages' (`021`)
`create-content-page.ts` already established.

**Rationale**: neither `013` nor `020` needed a slug for their own
scope (list/CMS by `id`) — this feature is the first to need a
public, permanent URL, the same "first feature that needs it defines/
extends the shape" pattern used throughout. Keeping it creation-time-
only and immutable mirrors handle immutability's own reasoning: a
stable public URL shouldn't silently break because someone fixed a
typo in the title later.

**Alternatives considered**: using `id` directly in the URL
(`/news/{uuid}`) — rejected, the wireframe's own `/news/:slug`
framing and general good URL practice both call for a human-legible
path; regenerating the slug on every title edit — rejected, would
break previously-shared/bookmarked links.

## 3. Computed read time, not the unused stored column

**Decision**: read time = `Math.ceil(wordCount / 200)` minutes (a
standard average reading-speed constant), computed from `body` at
render time. `013`'s `readTimeMinutes` column is never read by this
feature.

**Rationale**: no feature has ever populated `readTimeMinutes` (Admin
News' editor has no field for it) — displaying a null value would
break the "X min read" UI entirely. Computing it directly is not only
consistent with this project's "computed over stored" preference, but
the only way to make the UI element actually show a real number at
all.

**Alternatives considered**: adding a manual "read time" field to
Admin News' editor — rejected, extra editor complexity for a value
trivially and more reliably derived from the body that already
exists; leaving `readTimeMinutes` populated by this feature on every
article read (a cache) — rejected, unnecessary write-on-read for a
cheap computation.

## 4. Like reuses `010`'s polymorphic table; Save gets its own new table

**Decision**: `likes.targetType` gains a third value, `newsPost`
(alongside `010`'s existing `thread`/`reply`) — no schema shape
change, just a new enum value and this feature as its third consumer.
`savedNewsPosts` is a new, separate table (`userId`, `newsPostId`,
`createdAt`), NOT a generalization of `SavedListing` (`007`).

**Rationale**: `likes` was already built polymorphic by `010` — this
feature is simply the natural third consumer of a shape that already
supports it, no schema change needed. `SavedListing`, by contrast, is
NOT polymorphic (it's posting-specific by name and shape) and has had
exactly one consumer until now — generalizing it prematurely (with
only two total consumers) doesn't meet this project's own established
bar for that kind of change (`warnings`' generalization happened
specifically because a THIRD real consumer appeared, per `018`'s own
research). A second new, small, separate table is the more
disciplined choice here.

**Alternatives considered**: generalizing `SavedListing` to
`targetType`/`targetId` now, treating this as the trigger — rejected,
premature by this project's own precedent; the criteria clearly
distinguishes "second consumer" from "third consumer, generalize" and
this is only the second.

## 5. "Save" needs a real, visible effect

**Decision**: a small, bounded amendment to Profile's (`007`) Saved
tab adds a "Saved articles" section reading from `savedNewsPosts`,
alongside its existing saved-postings list.

**Rationale**: identical reasoning to every prior "a control needs a
real effect, not just a silent write" case in this project (Blocked
Users' enforcement, Admin Postings' Remove) — a "Save" button with no
way to ever revisit what you saved would be a no-op feature from the
user's perspective.

**Alternatives considered**: shipping "Save" with no visible saved-
list anywhere, deferring that to later — rejected, this project has
consistently preferred shipping the full round-trip of a control
(write + a real way to read it back) in the same pass when the read
side is this cheap to add (one more section in an already-existing
tab).

## 6. "Keep reading" and the subscribe box reuse `013` directly

**Decision**: both reuse News feed's (`013`) existing query/action
with no new logic — "Keep reading" is just "3 most-recently-live
posts, excluding the current one," and the subscribe box calls
`013`'s `subscribe-newsletter.ts` unchanged.

**Rationale**: no new capability is needed for either — both are
directly expressible via `013`'s already-correct, already-tested
mechanisms.

**Alternatives considered**: a "related by category" algorithm
instead of "most recent" — rejected as unrequested complexity; the
wireframe's own seed data doesn't suggest category-matching is
required, and "most recent, excluding current" is the simplest
correct reading of "Keep reading."
