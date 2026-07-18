# Feature Specification: Prevent duplicate active applications (close the TOCTOU race)

**Feature Branch**: `046-applications-unique-active`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: "A unique active application per (posting, applicant) is enforced only in application code with a select-then-insert, duplicated across the apply and invite paths, with no transaction or DB constraint. Two near-simultaneous requests can both pass the check and create two active rows. Close the race with a partial unique index + conflict-safe writes; dedup any existing duplicates first."

## Context *(why this feature exists)*

A player should have at most one *active* application to a given party at a time — one that's
still pending or already accepted. The product enforces this today only in application code: two
separate write paths (submitting an application, and a host inviting a player) each independently
run a "does an active application already exist?" check and, if not, create one. Neither uses a
transaction or a database constraint.

That leaves a genuine race: two requests that arrive at nearly the same moment — a double-submitted
apply, or an applicant applying at the very instant a host invites them — can *both* run the check,
*both* see no existing active application, and *both* create one. The result is two active
application rows for the same player and party. Because accepting an application decrements the
party's open seats and builds a roster, a duplicate active application can corrupt exactly the
seat/roster accounting the accept flow is otherwise careful to protect.

The original decision deliberately avoided a database constraint (documented in the schema:
"Drizzle's partial-unique-index support varies and the check is cheap in code"). This feature
reverses that now that the race is understood: it adds the missing data-layer guarantee — a partial
unique index over *active* applications — keeps the friendly application-code check as the primary
UX, makes both writers tolerate a lost race gracefully, and cleans up any pre-existing duplicates
first.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A player can never hold two active applications to the same party (Priority: P1)

No matter how an active application is created — a player double-submitting, or a player applying at
the same instant a host invites them — the player ends up with exactly one active application to that
party. A duplicate attempt is refused with the same friendly "you already have an active application"
message players see today, never a raw error.

**Why this priority**: This is the race and the corruption it can cause. Closing it is the entire
point — it protects seat/roster accounting from the one state it can't otherwise defend. Independently
valuable and testable.

**Independent Test**: Fire two apply requests for the same player/party concurrently → exactly one
active application exists afterward and neither request errors. Fire an apply and an invite for the
same pair concurrently → still exactly one. A normal (sequential) duplicate attempt → the existing
friendly rejection.

**Acceptance Scenarios**:

1. **Given** a player with no active application to a party, **When** two apply requests for that party
   arrive concurrently, **Then** exactly one active application exists afterward and neither request
   returns a raw error.
2. **Given** a player with no active application, **When** an apply and a host-invite for the same
   player/party arrive concurrently, **Then** exactly one active application exists afterward.
3. **Given** a player who already has an active application, **When** they apply again (sequentially),
   **Then** it is refused with the existing "you already have an active application" message.
4. **Given** a host whose invite loses the race to a concurrent apply, **When** the invite completes,
   **Then** it resolves as a benign "already has an active application" result, not an error.

---

### User Story 2 - Re-applying after a decline or withdrawal still works (Priority: P2)

The uniqueness covers only *active* applications. A player whose previous application was declined or
withdrawn can apply again — the terminal states don't block a fresh application. Nothing about the
decline/withdraw flow changes.

**Why this priority**: The guarantee must not over-reach into terminal states, or it would trap a
player who was declined and wants to try again. It's separable from US1 and must be verified so the
constraint isn't accidentally made too broad.

**Independent Test**: Apply, have it declined (or withdraw it), then apply again → the second
application succeeds. Same for a withdrawn one.

**Acceptance Scenarios**:

1. **Given** a player whose application to a party was declined, **When** they apply again, **Then** it
   succeeds (a new active application is created).
2. **Given** a player who withdrew their application, **When** they apply again, **Then** it succeeds.
3. **Given** a player with an active (pending or accepted) application, **When** they apply again,
   **Then** it is refused — only terminal-state predecessors free them to re-apply.

---

### User Story 3 - Existing duplicates are cleaned up, and the app-side check stays (Priority: P3)

Any pre-existing duplicate active applications (from a race before this fix) are collapsed to one
before the guarantee is put in place, keeping the most-progressed row. The application-code check is
retained alongside the database guarantee, so the common "you already applied" path stays fast and
friendly and never depends on catching a database error.

**Why this priority**: The data-layer guarantee can't be created while duplicates exist, so cleanup is
a prerequisite; and keeping the app-side check is what preserves the clean UX. Both harden US1, so they
land last.

**Independent Test**: Seed two active applications for one pair (bypassing the check), run the cleanup →
one remains (the accepted one if present, else the oldest). With the guarantee absent, a normal
duplicate is still refused by the app-side check; with the app-side check absent, the data layer still
prevents a second active row.

**Acceptance Scenarios**:

1. **Given** a pair with two active applications (one accepted, one pending), **When** the cleanup runs,
   **Then** the accepted one is kept and the pending one removed.
2. **Given** a pair with two active applications of the same status, **When** the cleanup runs, **Then**
   the oldest is kept.
3. **Given** the cleanup has already run, **When** it runs again, **Then** no application changes
   (idempotent).
4. **Given** a normal duplicate attempt, **When** it is made, **Then** the friendly rejection comes from
   the app-side check without relying on a database error.

---

### Edge Cases

- **Pre-existing duplicates block the guarantee**: if any pair already has >1 active application, the
  uniqueness guarantee can't be established; existing active duplicates MUST be collapsed once, first.
- **Which duplicate wins**: keep `accepted` over `pending` (an accepted row backs a real roster seat),
  tie-broken by oldest, so cleanup never discards the row that reflects an actual roster membership.
- **Terminal states excluded**: `declined`/`withdrawn` applications are not "active" — they neither
  block re-application nor are touched by the guarantee.
- **Lost race is benign**: whichever concurrent writer loses resolves as the ordinary "already has an
  active application" outcome, never a server error.
- **Idempotent cleanup**: safe to run more than once (local, then production, and re-runs) with no
  further change.
- **Migration ordering**: collapse active duplicates → establish the uniqueness guarantee; the
  destructive/constraint steps are applied to production by hand before merge, verified by querying.
- **Seat accounting caveat**: cleanup removes an extra application row but does not attempt to re-derive
  a party's open-seat count; if it ever removes a genuinely-accepted duplicate, a seat may need manual
  reconciliation (noted as out of scope / future work, since it's vanishingly unlikely at current scale).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A player MUST NOT be able to hold more than one *active* application (status pending or
  accepted) to the same party, and this MUST be guaranteed at the data layer so no concurrent race
  between the apply and invite paths can create a second one.
- **FR-002**: The uniqueness MUST cover only active applications; a player whose prior application is
  declined or withdrawn MUST still be able to create a new application.
- **FR-003**: Both the apply and invite paths MUST retain their application-code "already has an active
  application" check as the primary, friendly rejection, AND MUST tolerate a lost race without a raw
  error — a duplicate that reaches the data layer resolves as the same friendly rejection.
- **FR-004**: Before the uniqueness guarantee is established, the system MUST collapse any existing
  duplicate active applications once, keeping exactly one per (party, player): the `accepted` row over a
  `pending` one, tie-broken by oldest. This cleanup MUST be idempotent and safe against every environment.
- **FR-005**: Establishing the guarantee MUST NOT change any existing behavior other than preventing a
  duplicate active application: the friendly rejection message, the accept/decline/withdraw transitions,
  seat/roster accounting, and re-application after a terminal state MUST all be unchanged.
- **FR-006**: The uniqueness rule MUST match the existing active-application definition (pending or
  accepted) so the data-layer guarantee and the application-code check agree exactly.

### Key Entities *(include if feature involves data)*

- **Application**: a player's request/invitation to join a party, with a status (pending, accepted,
  declined, withdrawn). This feature adds a per-(party, player) uniqueness guarantee over the *active*
  statuses and collapses any pre-existing active duplicates; it does not change the shape, the statuses,
  or the transitions.
- **Active application**: an application whose status is pending or accepted — the set the uniqueness
  covers. Terminal (declined/withdrawn) applications are outside it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Under a concurrent double-apply or apply+invite for the same player/party, exactly one
  active application exists afterward, in 100% of cases (today: two can be created).
- **SC-002**: 0 concurrent or duplicate attempts surface a raw server error; a lost race yields the
  friendly rejection.
- **SC-003**: 100% of re-applications after a decline or withdrawal still succeed (no regression).
- **SC-004**: The one-time cleanup collapses every pre-existing active-duplicate pair to one row,
  preserving the accepted-then-oldest row, and changes 0 rows on a second run (idempotent).
- **SC-005**: The full existing test suite passes, including seat/roster and accept/decline behavior, with
  no regression.

## Assumptions

- **Active = pending or accepted.** This matches both existing application-code checks; terminal states
  (declined/withdrawn) are intentionally free to re-apply.
- **Duplicates may already exist** (a race could have created some), so the cleanup must assume and handle
  them rather than presume a clean table — though at current scale it will almost certainly find none.
- **The app-side check stays.** The database guarantee is the backstop that closes the race; the
  application-code check remains the primary, friendly path (defense-in-depth), mirroring how duplicate
  games are handled elsewhere.
- **Production DDL is applied by hand before merge**, so the automatic schema reconciliation on deploy is a
  verified near-no-op; each step is checked by querying, not trusted to a silent migration.

## Out of Scope

- Changing the status vocabulary, the accept/decline/withdraw transitions, or seat/roster accounting.
- A "one application per player across all parties" rule — uniqueness is per (party, player), unchanged.
- Re-deriving or repairing a party's open-seat count for any historical duplicate a race may have created;
  the cleanup removes the extra row only. If it ever removes a genuinely-accepted duplicate, a seat may
  need manual reconciliation (logged to future work).
- Preventing duplicates in any other table — this is specifically the active-application guarantee.
- Tech-debt backlog items #3–#7.
