# Phase 0 Research: Admin Postings

## 1. Computed severity, not stored

**Decision**: no severity column anywhere. A queue card's/drawer's
severity is computed at read time as the worse of (a) the highest
severity among its open reports' reasons (reusing the exact
reason-keyword mapping already established for report-reason chips:
scam/harassment/underage/safety → high, spam/inappropriate → med,
else low) and (b) its `autoFlagReason` code's own fixed severity
(`phishing_or_scam`/`boosting_service` → high, `new_account_first_post`
→ low).

**Rationale**: identical reasoning already applied repeatedly
(Error Pages' HOT, Admin Users' Flagged) — a value fully derivable
from existing rows shouldn't also be a separately stored field that
could drift out of sync with the data that determines it.

**Alternatives considered**: a moderator-set severity field —
rejected, would add manual upkeep for a value the data already
implies, and the wireframe's own seed data doesn't suggest any
distinct manual-override use case.

## 2. A small, fixed, deterministic auto-flag ruleset

**Decision**: `create-posting.ts` (`005`) gains a bounded check at
insert time: scan `title`/`blurb` against a small fixed banned-phrase
and external-link-pattern list → `phishing_or_scam`; against a small
fixed boosting/paid-rank-service keyword list → `boosting_service`;
otherwise, if the author's account is newer than a fixed threshold
(e.g. 3 days) and this is their first posting → `new_account_first_post`.
Whichever matches first is written to the new `autoFlagReason`
column; no match leaves it null.

**Rationale**: the queue needs real, non-decorative auto-flagged
data to review, and a "Remove"/"Approve" action against fabricated
demo-only auto-flags would be hollow. A small fixed keyword/account-
age check is deterministic, has no external dependency, and is
proportionate to what this feature actually needs — matching the
project's repeated preference for the smallest real mechanism over
speculative infrastructure (e.g., rejecting real presence-tracking
systems elsewhere).

**Alternatives considered**: a third-party content-moderation API or
learned classifier — rejected as disproportionate scope for this
feature and this project's stage; a purely decorative/seeded
auto-flag with no real detection — rejected because "Approve"/"Remove"
against fabricated data would be a no-op moderation feature, the same
reasoning Admin Users already applied to its own Remove action.

## 3. `warnings` — first feature that needs it defines its minimal shape

**Decision**: new table — `userId` (warned author), `moderatorId`
(issuer), `postingId` (nullable, the posting that prompted it),
`reason` (nullable free text), `createdAt`. "Prior warnings" (shown
here and, going forward, in Admin Users' own drawer) is simply a
count of a user's rows here.

**Rationale**: the same "first feature that needs a shared entity
defines its minimal shape, later features extend it" pattern already
used for `Notification` (`012`) and `AuditEntry` (`015`) — Admin Forum
(`018`) and Admin Reports (`019`) will very likely also need a Warn
action against this same table, per `guidelines.md`'s §8.4/§8.5, but
neither is spec'd yet, so this feature only defines what it itself
needs (a nullable `postingId`, not a polymorphic target system).

**Alternatives considered**: a polymorphic `warnings.targetType`/
`targetId` pair mirroring `reports`, anticipating Admin
Forum/Reports' future needs — rejected as speculative for a feature
not yet spec'd (Principle IV); a nullable `postingId` is trivially
extensible (add a nullable `forumThreadId` etc. later, or generalize
if a third distinct source appears) without overbuilding now.

## 4. `reports.status` gains its first real transition

**Decision**: Approve/Remove/Warn/Ban-triggered-remove all resolve
every currently-open report against the acted-on posting by setting
`status = 'resolved'`. No second status value (e.g. `dismissed`) is
introduced.

**Rationale**: `008`'s `reports` table has carried a `status` column
since its own spec, always written as `open` and never transitioned
by any feature since (`008` itself, `010-forum-thread`,
`012-notifications-and-report-modal` all explicitly left it alone).
This feature is naturally the first real consumer that needs to
close reports out, and one terminal value is sufficient for
everything this feature itself needs to express — Approve and Remove
don't need to be distinguishable from each other via `reports.status`
alone, since the posting's own `removedAt` (set or not) already
carries that distinction.

**Alternatives considered**: introducing `dismissed` alongside
`resolved` now, anticipating Admin Reports' (`019`, not yet spec'd)
likely need to distinguish "dismissed as unfounded" from "actioned" —
rejected per Principle IV (Scope Discipline): inventing a value no
current feature reads or writes yet is speculative; `019` can add it
when it actually needs the distinction.

## 5. `logAuditEntry()` gets its first real callers — including a retroactive fix to `016`

**Decision**: this feature's own Approve/Remove/Warn actions call
`logAuditEntry()` (category `moderation`). Additionally, `016`'s
`toggle-user-ban.ts` and `remove-user-content.ts` — both already
shipped, both real state-changing moderation actions — are amended
to call it too, since `015`'s own spec explicitly named "Admin
Users/Postings/Forum/News" as the anticipated real callers, and `016`
shipped before `015`'s follow-through was checked.

**Rationale**: leaving `016`'s two actions un-logged means the
dashboard's own "recent activity" feed silently under-reports real
moderation activity that has been happening since `016` merged — a
staleness gap of exactly the kind this project has repeatedly caught
and fixed (Admin Users' own `removedAt`-exclusion amendments to
Home/Browse/Forum index are the direct precedent). The fix is two
one-line additions to two already-correct, already-tested functions,
not a design change to either.

**Alternatives considered**: leaving `016` as-is and only wiring this
feature's own actions — rejected, since the gap was already
anticipated and named by `015`'s own spec and costs almost nothing to
close now that it's noticed.

## 6. Admin Dashboard's "live postings"/"top games" queries predate `removedAt`

**Decision**: `015`'s `get-dashboard-kpis.ts` ("Live postings") and
`get-top-games.ts` both filter `postings WHERE status = 'open'`;
both gain `AND removedAt IS NULL`.

**Rationale**: `015` shipped before `016` added `postings.removedAt`,
so a posting removed by a moderator (via `016`'s drawer, or now via
this feature) but still carrying `status = 'open'` (its own
open/full/closed lifecycle is independent of moderation removal)
currently over-counts as "live" and could still surface in "top
games." Same single-added-condition amendment pattern `016` already
used on Home/Browse/Forum index — noticed now because this feature is
the other major producer of `removedAt`-set rows.

**Alternatives considered**: leaving it, on the theory that removed
postings are rare enough not to matter — rejected, since the fix is a
single added clause in two already-small functions and the dashboard
KPI existing specifically to be trustworthy at a glance.

## 7. Search/filter follows the established server-side pattern

**Decision**: `get-posting-queue.ts` takes a validated filter
(`all`/`reported`/`flagged`) and runs a real query — the same
architecture already used for Browse, Forum index, and Admin Users.

**Rationale**: identical scaling reasoning already established
multiple times; no new pattern needed.

**Alternatives considered**: none new.
