# Phase 0 Research: Admin Forum

## 1. Classifying a `reports.targetType = 'forum'` row (thread vs. reply)

**Decision**: `get-forum-queue.ts`/`get-forum-review.ts` resolve a
report's `targetId` against `forumThreads` first, then `forumReplies`,
to determine which it is and to fetch the actual content.

**Rationale**: `010`'s `reports` usage never added a discriminator
column — it didn't need one for its own scope (submitting a report).
Two lookups against small, indexed primary-key columns is a
proportionate way to resolve this, not worth a schema change to an
already-merged, already-correct table.

**Alternatives considered**: adding a `contentKind` column to
`reports` itself — rejected, would touch a table three other features
(`008`, `010`, `012`) already read/write against a stable shape, for a
lookup this feature can just as easily do with two queries.

## 2. Extracting `reason-severity.ts` — and fixing a wireframe/taxonomy mismatch

**Decision**: new shared `src/lib/moderation/reason-severity.ts`,
mapping the canonical `reports.reason` enum (`012`'s taxonomy) to
severity: `underage`/`harassment` → high, `impersonation`/
`inappropriate`/`spam` → med, `other` → low. Admin Postings' (`017`)
`get-posting-queue.ts` is amended to import this instead of its own
inline version.

**Rationale**: both moderation wireframes' seed data use flavor-text
reason labels ("Scam / phishing," "Off-topic") for demo flavor, but
neither corresponds to an actual value in `012`'s ratified reason
taxonomy — `017`'s own spec, written against that same wireframe
flavor text, inherited the same mismatch (it invented a "scam"
bucket and never accounted for `impersonation`). This feature is the
first to notice, because it needs the identical mapping for a second
wireframe with the same kind of flavor text. Fixing it now, in one
shared place, prevents the two features from silently diverging on
what "high severity" even means.

**Alternatives considered**: keeping each feature's own inline,
slightly-different mapping — rejected, the exact kind of drift this
project has repeatedly caught and closed (e.g. Admin Users' `removedAt`
exclusion gaps); a per-feature override of the shared mapping — not
needed, nothing about severity is feature-specific.

## 3. Extracting `auto-flag-rules.ts`

**Decision**: new shared `src/lib/moderation/auto-flag-rules.ts`,
the same fixed ruleset `017` introduced (banned-phrase/external-link →
`phishing_or_scam`; boosting-service keywords → `boosting_service`;
new-account first-post → `new_account_first_post`), parameterized over
whatever text fields the caller passes (a posting's title/blurb; a
thread's title/body; a reply's body) plus the author's account-age/
post-count. `017`'s `create-posting.ts` is amended to import it.

**Rationale**: identical ruleset, second real consumer (`009`'s
`create-thread.ts`, `010`'s `post-reply.ts`) — extracting now avoids
three near-identical inline copies quietly drifting apart, the same
reasoning as #2.

**Alternatives considered**: a forum-specific ruleset with different
categories (e.g. a distinct "giveaway scam" bucket for the wireframe's
"external link + giveaway phrasing" flavor text) — rejected as
unnecessary proliferation; that pattern already fits `phishing_or_scam`
without inventing a fourth code for a demo-only nuance.

## 4. Generalizing `warnings` to `targetType`/`targetId`

**Decision**: `017`'s `warnings.postingId` (nullable uuid) is replaced
with `targetType` (nullable text: `posting`\|`forumThread`\|
`forumReply`) and `targetId` (nullable uuid). `017`'s
`resolve-posting-report.ts` is amended to write `targetType =
'posting'` instead of setting `postingId`.

**Rationale**: `017`'s own research.md #3 explicitly named this exact
trigger condition — "generalize if a third distinct source appears" —
and this feature is that third source (after postings and, now,
threads/replies as two more). This mirrors the polymorphic shape
`reports`/`likes` already use elsewhere in this project, rather than
inventing a fourth ad hoc pattern.

**Alternatives considered**: adding a second nullable
`forumThreadId`/third `forumReplyId` column instead of generalizing —
rejected once a third source existed; two/three mutually-exclusive
nullable FK columns is a worse shape than the polymorphic pair this
project already uses twice.

## 5. "Actioned today" reads `auditEntries`, not a new counter

**Decision**: `actionedToday` = `COUNT(*) FROM auditEntries WHERE
category = 'moderation' AND targetType IN ('forumThread',
'forumReply') AND createdAt` is today.

**Rationale**: this feature has five distinct resolution actions
(approve/remove/lock/warn/ban), with no single shared field the way
`017`'s "removed today" could just read `removedAt` — the audit log
every one of them already writes to (per FR-012, and Ban via `016`'s
own existing audit path) is the natural, already-accurate unified
source. This is also the first time any feature reads `auditEntries`
for a live product-facing statistic rather than just the Admin
Dashboard's own recent-activity feed — exactly the kind of real,
demonstrable use `015`'s spec anticipated when it shipped the table
ahead of real writers.

**Alternatives considered**: a dedicated `actionedToday` counter,
incremented by each resolution action — rejected, an extra piece of
mutable state to keep in sync with data (`auditEntries`) that already
answers the same question.

## 6. Locking must actually block replies

**Decision**: `010`'s `post-reply.ts` gains a check: if the target
thread's `lockedAt` is set, reject the reply (surfaced as a normal
validation-style rejection, not a crash).

**Rationale**: same "a moderation action must have a real effect"
reasoning already applied to `removedAt` exclusion (`016`'s research)
— a "Lock" that only changes a timestamp with no enforcement would be
decorative.

**Alternatives considered**: enforcing the lock only in the UI (hiding
the reply form) — rejected per Principle II, every Server Action
re-validates its own preconditions server-side regardless of what the
UI shows.

## 7. Filter/query pattern

**Decision**: `get-forum-queue.ts` takes a validated filter
(`all`/`threads`/`replies`/`flagged`) and runs a real query spanning
both tables — same server-side pattern as every prior list/queue
feature.

**Rationale**: identical scaling reasoning already established
multiple times; no new pattern needed.

**Alternatives considered**: none new.
