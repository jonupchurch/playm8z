# Phase 1 Data Model: Landing page

## Applications (extends `006-listing-detail`'s table, written by `011-inbox-messaging`)

| Field | Type | Notes |
|---|---|---|
| `acceptedAt` | timestamp, nullable | New. Set once, by `011`'s existing `accept-request.ts`, alongside its existing `status = 'accepted'` write (research.md #3). Never set for `pending`/`declined`/`withdrawn` rows. |

No other schema change — every other number this feature shows is a
read-only aggregate over already-existing tables.

## Computed values (no new tables beyond the one field above)

| Value | Source |
|---|---|
| Total players | `COUNT(*) FROM user` |
| Games & tables | `COUNT(DISTINCT game) FROM postings` |
| Parties formed this week | `COUNT(*) FROM applications WHERE acceptedAt >= now() - interval '7 days'` |
| Hero floating card(s) | 1-2 most recent `postings WHERE status = 'open'`, same shape Home's/Browse's listing cards already read |
| Per-genre open counts | `postings WHERE status = 'open' GROUP BY genre` (Browse's, `004`, existing 8-value enum) |

## Validation rules

None — this feature has no Server Actions, forms, or user input of
its own. `applications.acceptedAt` is set by `011`'s already-validated
`accept-request.ts`, not by any new input path here.

## State notes

- `acceptedAt` transitions null → timestamp exactly once, at the same
  moment `status` transitions to `accepted` — never cleared or reset
  afterward (no un-accept flow exists).
- Every other value this feature reads is a live aggregate,
  recalculated on every request — nothing is cached or stored
  redundantly.
