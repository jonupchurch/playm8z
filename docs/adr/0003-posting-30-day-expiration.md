# 0003. Postings expire 30 days after creation unless closed or renewed

**Status**: Accepted (2026-07-12)

## Context

Nothing in the wireframes or guidelines.md's data model said when a
`Posting` stops being live. An "anytime" posting (no `scheduledDate`) could
otherwise stay in the Home/Browse feed forever, and a host who's moved on
without manually closing it would keep collecting applications.

## Decision

A `Posting` auto-expires **30 days after creation**, unless the host closes
it manually before then (already-designed: Profile → My postings →
Close/Reopen) or renews it (resets the 30-day window from the renewal
time). An expired posting stops appearing in Home/Browse/search results
the same way a manually-closed one does.

## Consequences

- `src/db/schema.ts`'s posting table needs a way to compute/derive
  "expired" (e.g. `createdAt`/`renewedAt` + 30 days, checked at query time,
  or a stored `expiresAt` column) — a decision for whoever plans/implements
  the Posting feature, not fixed here.
- A "Renew" action needs a home in the UI — most naturally alongside the
  existing Edit/Close/Reopen actions on Profile → My postings (per
  `resources/guidelines.md` §7.7), and possibly on the Listing detail page
  for the host. No wireframe currently shows a Renew button; treat this as
  a small addition needed wherever Close/Reopen already appears.
- Whether a `scheduledDate` further in the future than 30 days should
  extend the expiry, or whether the 30-day rule is flat regardless of
  `scheduledDate`, is not addressed here — flag it during planning if it
  comes up.
