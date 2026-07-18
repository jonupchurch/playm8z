# Data Model: Prevent duplicate active applications

One table touched. No new columns, no status changes.

## `applications` (new guarantee, unchanged shape)

| Field | Notes |
|-------|-------|
| `id` | uuid PK |
| `postingId` | FK → postings, cascade |
| `applicantId` | FK → users, cascade |
| `message` | text, nullable |
| `status` | `pending \| accepted \| declined \| withdrawn` (default pending) |
| `initiatedBy` | `applicant \| host` (default applicant) |
| `createdAt`, `acceptedAt`, … | unchanged |

**New**: a **partial unique index** over active applications:

```
UNIQUE (postingId, applicantId) WHERE status IN ('pending','accepted')   -- index: applications_active_uniq
```

- At most one *active* (pending/accepted) application per (posting, applicant). Terminal
  (declined/withdrawn) rows are outside the predicate → re-application after them still allowed.
- Predicate matches the existing app-side `status IN (pending,accepted)` checks exactly.
- Declared in `src/db/schema.ts` (`uniqueIndex(...).on(postingId, applicantId).where(sql\`status IN
  ('pending','accepted')\`)`), gated by the drizzle-kit-push double-push idempotency check (research #2).

**Pre-condition**: all pre-existing active-duplicate groups collapsed by `dedupeActiveApplications()` before
the index is created (winner: accepted > pending, then oldest). Without it, index creation fails.

### Write paths after this feature

| Path | Today | After 046 |
|------|-------|-----------|
| `applyToPosting` | select-check, then bare INSERT | select-check + INSERT `.onConflictDoNothing().returning()`; empty return → existing friendly rejection |
| `inviteToParty` | select-check, then bare INSERT | same conflict-safe treatment, same friendly message |

- The `applications_active_uniq` index is the only unique index on the table besides the PK, so a bare
  `ON CONFLICT DO NOTHING` can only ever swallow this conflict.
- Accept/decline/withdraw transitions, seat/roster accounting, `initiatedBy`, messages — all unchanged.

## Schema comment

The existing comment on `applications` ("enforced at the Server Action level … not a DB constraint, since
Drizzle's partial-unique-index support varies") is updated to reflect that the partial unique index now
exists (ADR 0018 supersedes that rationale; the app-side check is retained as defense-in-depth).
