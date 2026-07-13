# Phase 0 Research: Admin Reports

## 1. Grouping the queue by target, not by individual report row

**Decision**: `get-reports-queue.ts` groups open `reports` rows by
`(targetType, targetId)`, producing one card per distinct target with
a report count, using the earliest-filed open report as the
"representative" reporter/note.

**Rationale**: the wireframe's own seed data and "N reports" badge
confirm this — a target with three open reports is one card, not
three. This differs from `017`'s/`018`'s own queues, which enumerate
every report in their drawers — a deliberate difference, since this
feature's purpose is breadth-of-triage across four content kinds,
while `017`/`018` already own the depth for their own two.

**Alternatives considered**: showing every individual report as its
own row (matching `017`/`018`'s depth) — rejected, would make an
already-broad queue (four target types) noisy without adding triage
value; the "Open in [module] moderation →" link is exactly how a
moderator gets that depth when they need it.

## 2. Dismiss is generic; Remove/Warn delegate where an owner exists

**Decision**: `dismiss-report.ts` is one generic action (resolves
every open report on a target, any type). `resolve-report-action.ts`
branches: posting → calls `017`'s `resolve-posting-report.ts`
directly; forum → classifies via the shared
`classify-forum-target.ts` then calls `018`'s
`resolve-forum-report.ts`; message → this feature's own logic (sets
`messages.removedAt` for Remove, writes a `warnings` row for Warn);
user (profile) → this feature's own logic (Remove not offered; Warn
writes a `warnings` row with no target id).

**Rationale**: postings and forum content already have a fully-
correct, tested resolution path (audit logging, `moderationReviewedAt`
effects) — reimplementing it here would risk silent divergence between
"remove a posting from Reports" and "remove a posting from Postings'
own queue." Dismissal, by contrast, has no existing owner anywhere
(neither `017` nor `018` has a "the report itself was unfounded, but
don't touch content" concept distinct from Approve) — but since
Approve/Dismiss both just resolve reports without altering content,
this feature's own generic implementation is correct for every target
type, including postings/forum, without needing to call into `017`/
`018` at all for that specific action.

**Alternatives considered**: reimplementing posting/forum removal
logic locally for a simpler dependency graph — rejected, exactly the
kind of duplicated-logic drift this project has repeatedly caught and
prevented (`reason-severity.ts`/`auto-flag-rules.ts` extraction in
`018`); a single mega-action handling all four target types identically
— rejected, profiles and messages are different enough (no
`moderationReviewedAt`, no dedicated queue) to warrant their own
branches rather than a false unification.

## 3. "Total reports" is a cross-source, computed aggregate

**Decision**: `getTotalReportsForUser(userId)` counts: direct profile
reports (`targetType='user' AND targetId=userId`) + reports against
postings authored by `userId` + reports against forum threads/replies
authored by `userId` + reports against messages sent by `userId` — a
UNION-style aggregate, computed at read time.

**Rationale**: the wireframe's own seed data shows the same user
(`Spammer99`) carrying the identical `totalReports` value across two
different target-type cards (a posting report and a forum report),
confirming this is a per-user lifetime count spanning every source,
not a per-target number. Consistent with this project's "computed,
never stored" preference (Admin Users' "Flagged," `017`/`018`'s
severity).

**Alternatives considered**: a maintained `user.totalReportsReceived`
counter, incremented on every new report — rejected, an extra piece
of mutable state duplicating what's already fully derivable, with a
real risk of drifting out of sync (the same reasoning rejected a
stored `flagged` boolean in Admin Users).

## 4. `messages.removedAt` — a genuinely new capability

**Decision**: new nullable `removedAt` on `messages` (`011`); a small,
bounded amendment to `011`'s `[conversationId]/page.tsx` inline
messages query, adding `AND removedAt IS NULL`.

**Rationale**: no prior feature needed message moderation — Inbox
(`011`) never anticipated it, and this is the first feature whose
scope requires it. Same ADR-0005-consistent soft-hide pattern as
every other content type (`postings`, `forumThreads`, `forumReplies`)
— proportionate, one field, one query amendment, no tombstone UI
invented (a removed message simply no longer appears, matching how
removed postings/threads/replies behave).

**Alternatives considered**: a tombstone ("this message was removed")
in place of the hidden message — rejected as unrequested UI polish;
this project has consistently chosen plain exclusion over inventing
tombstone treatments for removed content elsewhere.

## 5. `reports.resolvedAt` — retroactive, both `017` and `018`

**Decision**: `017`'s `resolve-posting-report.ts` and `018`'s
`resolve-forum-report.ts` both gain `resolvedAt: now()` in the same
UPDATE that already sets `status = 'resolved'`.

**Rationale**: this feature's "resolved today"/"avg response" stats
need a timestamp neither prior feature added, since neither needed
one for its own scope (a report is either open or resolved, full
stop). Retroactively adding it is a one-line addition to an existing,
correct UPDATE statement — not a design change, and it makes every
future resolution (from any of the three moderation features)
immediately usable for this feature's stats with no further work.

**Alternatives considered**: deriving "resolved today" from
`auditEntries` instead (the same pattern `018` used for "actioned
today") — rejected here, since `reports` itself is the natural,
already-central source for report-specific stats, and adding one
timestamp column is simpler than joining through the audit log for
data the reports table should just carry directly.

## 6. Correcting `reason-severity.ts`'s `impersonation` mapping

**Decision**: `impersonation` moves from medium (as `018` first
assigned it) to high severity, alongside `underage`/`harassment`.

**Rationale**: this feature's own wireframe seed data explicitly
depicts an impersonation case as a serious, phishing-adjacent security
risk (a fake staff account soliciting a password) — high severity is
the more defensible real-world judgment, and correcting it once in the
now-shared helper immediately and correctly changes severity display
in `017`/`018` too, without touching either feature's own files.

**Alternatives considered**: leaving `018`'s medium assignment and
treating this feature's own severity display as a special case —
rejected, would reintroduce exactly the kind of per-feature severity
drift the shared helper was extracted specifically to prevent.

## 7. Extracting `classify-forum-target.ts`

**Decision**: `018`'s inline "check `forumThreads` then
`forumReplies`" classification (its research.md #1) is extracted into
a shared `src/lib/moderation/classify-forum-target.ts`, imported by
both `018`'s `get-forum-queue.ts` and this feature's
`resolve-report-action.ts`.

**Rationale**: this feature needs the identical classification (to
know which of `018`'s resolve-action target types to delegate to) —
the same "extract on a second real consumer" reasoning already applied
twice (`reason-severity.ts`, `auto-flag-rules.ts`).

**Alternatives considered**: duplicating the two-query check inline
here — rejected for the same drift-risk reasoning as #2/#6.

## 8. Filter/query pattern

**Decision**: `get-reports-queue.ts` takes a validated target-type
filter and runs a real, grouped query — same server-side pattern as
every prior list/queue feature.

**Rationale**: identical scaling reasoning already established
multiple times; no new pattern needed.

**Alternatives considered**: none new.
