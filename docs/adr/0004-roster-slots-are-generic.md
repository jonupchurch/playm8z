# 0004. Roster slots are generic, not role-typed

**Status**: Accepted (2026-07-12)

## Context

`resources/guidelines.md` §5 modeled `RosterSlot` with a `role(label)`
field, and the Listing detail wireframe's example content shows
specifically-labeled slots ("Entry / Initiator," "Flex," "Controller ·
Host") — reading like a structured role-matching system where a host
posts open slots by role and applicants apply to a specific one.

## Decision

There is no structured/enforced role-matching on roster slots. A
`Posting`'s free-text description is what conveys what the host is
looking for (e.g. "need a healer and 2 DPS"), and an applicant's free-text
application message conveys their own fit ("I main healer, available
evenings") — per the placeholder copy already on the Apply form
("Introduce yourself — rank, role, availability…"). Roster slots are
generic open/filled seats. The example role labels in the Listing
wireframe are flavor/example content, not a feature to build.

## Consequences

- There is no "apply for this specific slot" flow — an applicant applies
  to the posting as a whole, and the host accepts into any open (generic)
  seat.
- `RosterSlot.role`, if kept at all in the schema, is at most an optional
  host-entered display label set at acceptance time (e.g. so the roster
  list can still show "Kira — Sentinel" per the wireframe's visual), not a
  structured taxonomy, not something applicants select, and not something
  the system matches against.
- Whoever plans/implements the Listing/Application feature should not
  build role-based slot matching or a role picker in the Apply flow.
