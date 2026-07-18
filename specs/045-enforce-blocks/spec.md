# Feature Specification: Enforce blocks on party/listing interactions

**Feature Branch**: `045-enforce-blocks`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: "A block is enforced for direct messages and notifications but not for the party/listing interaction paths. A blocked user can still apply to your listing, ask a question on it, be invited to your party, or be accepted onto your roster. Close that gap: apply the existing bidirectional block check to those four write paths, fail-closed, with neutral errors."

## Context *(why this feature exists)*

Blocking someone is supposed to stop them from interacting with you. The product already
enforces this for the two paths it was wired into — starting a direct message and receiving
a notification — using one shared, bidirectional check ("is there an active block between
these two people, in either direction?"). But the same check was never added to the
party/listing interaction paths.

The result is a real trust/safety gap: a person you have blocked (or who has blocked you) can
still **apply to your listing**, **ask a question on it**, **be invited to your party**, and
**be accepted onto your roster** — all the ways two players actually interact around a game
posting. The block silently does nothing on exactly the surfaces where unwanted contact is
most likely. The blocks table's own documentation says these surfaces "should query active
blocks in both directions"; only messaging and notifications actually do.

This feature closes that gap by applying the existing block check to those four write paths.
It adds no new mechanism and changes nothing about how blocking itself works — it just makes
the block mean what it already promises, everywhere two players connect around a posting.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A blocked person can't apply to or question your listing (Priority: P1)

When there is an active block between two players (in either direction), the blocked party can
no longer apply to the other's listing, nor ask a question on it. The attempt is refused with a
neutral message that doesn't reveal a block exists. Everyone not in a block relationship applies
and asks exactly as before. Unblocking restores the ability.

**Why this priority**: These are the most common inbound-to-host interactions on a listing and
the most direct way a blocked person reaches someone. Fixing them delivers the core promise of a
block on the listing surface, and is independently valuable and testable.

**Independent Test**: With an active block between A and B, have A try to apply to B's listing and
to ask a question on it → both refused. Reverse the block direction (B blocked A) → still refused.
Remove the block → both succeed. A third, unblocked player → unaffected.

**Acceptance Scenarios**:

1. **Given** A has blocked B, **When** B applies to A's listing, **Then** the application is
   refused and no application is created.
2. **Given** A has blocked B, **When** B asks a question on A's listing, **Then** it is refused and
   no question is created.
3. **Given** B has blocked A (opposite direction), **When** B applies to or questions A's listing,
   **Then** it is still refused (the block is symmetric).
4. **Given** no block between A and B, **When** B applies or asks, **Then** it succeeds exactly as
   before this feature.
5. **Given** A had blocked B and then unblocked them, **When** B applies or asks, **Then** it
   succeeds.
6. **Given** a host with no block, **When** the host asks a question on their own listing, **Then**
   it still succeeds (a self-interaction is never a block).
7. **Given** any refused attempt, **When** the user sees the error, **Then** it does not disclose
   that a block exists or who blocked whom.

---

### User Story 2 - A blocked person can't join your party roster (Priority: P2)

When there is an active block between two players, a host cannot invite the blocked party to their
party, and an accept that would put the two players together on a roster is refused — whether it's
the host accepting an applicant or an invited player accepting the host's invite. Existing seat,
roster, and transaction behavior is otherwise unchanged.

**Why this priority**: Invitation and acceptance are how a player actually ends up *on a roster
together* with someone — the strongest form of the unwanted contact a block is meant to prevent.
It's separable from US1 (a different pair of write paths) and independently testable.

**Independent Test**: With an active block between host H and player P, have H try to invite P →
refused. Create a pending request between H and P, then attempt the accept → refused, with the
roster/seats unchanged. Reverse the block direction → still refused. Remove the block → both
succeed.

**Acceptance Scenarios**:

1. **Given** an active block between H and P, **When** H invites P to a party, **Then** the invite
   is refused and no application is created.
2. **Given** an active block between H and P and a pending request between them, **When** the accept
   is attempted, **Then** it is refused, and the posting's open seats and roster are unchanged.
3. **Given** the block is in either direction, **When** invite or accept is attempted, **Then** it is
   still refused (symmetric).
4. **Given** no block, **When** H invites P or the pending request is accepted, **Then** it succeeds
   with seats/roster updated exactly as before.
5. **Given** the block existed and was removed, **When** invite or accept is attempted, **Then** it
   succeeds.

---

### User Story 3 - The guard is symmetric and fails closed (Priority: P3)

The block check behaves identically no matter which side blocked the other, and if the system cannot
determine block status for any reason, the interaction is refused rather than allowed. A blocked
interaction that is refused produces no side effects — no notification, no partial roster change.

**Why this priority**: This hardens US1/US2 against the two ways a naive guard leaks — one-directional
checks and fail-open behavior. It's a property layered on the other stories, so it lands last, but
it's what makes the guarantee trustworthy.

**Independent Test**: For each guarded path, exercise both block directions and confirm identical
refusal. Simulate the block check being unable to answer and confirm the interaction is refused, not
allowed. Confirm a refused interaction fires no notification and leaves no partial state.

**Acceptance Scenarios**:

1. **Given** any guarded path, **When** the block exists in either direction, **Then** the outcome is
   the same refusal.
2. **Given** the block status cannot be determined, **When** a guarded interaction is attempted,
   **Then** it is refused (fail-closed), never allowed.
3. **Given** a refused interaction, **When** it completes, **Then** no notification is sent and no
   partial change (seat, roster, conversation, application, question) is persisted.

---

### Edge Cases

- **Opposite-direction block**: whether A blocked B or B blocked A, every guarded interaction between
  them is refused (the check is symmetric).
- **Host interacting with their own listing**: allowed — a self-interaction is never a block (there are
  no self-blocks).
- **Unblock then retry**: once the block is removed, previously-refused interactions succeed.
- **Block created after an interaction already exists**: this feature only guards *new* interactions;
  it does not retroactively remove an application/question created before the block.
- **Accept under a block**: because acceptance mutates seats/roster/conversation together, a block must
  refuse the whole thing atomically — no seat is decremented, no conversation created.
- **Information leakage**: refusal messages must be neutral; they must not confirm a block or its
  direction.
- **Fail-closed on error**: if the block lookup itself fails, the interaction is refused (the paths that
  currently have no error handling around their main logic must not turn a lookup failure into an
  unhandled error that bypasses the guard).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST refuse an application to a listing when an active block exists in either
  direction between the applicant and the listing's host, and MUST NOT create the application.
- **FR-002**: The system MUST refuse a question on a listing when an active block exists in either
  direction between the asker and the listing's host, and MUST NOT create the question. (Determining
  the host requires the listing to exist; a question on a non-existent listing MUST also be refused.)
- **FR-003**: The system MUST refuse an invitation when an active block exists in either direction
  between the host and the invited player, and MUST NOT create the invitation.
- **FR-004**: The system MUST refuse acceptance of a request when an active block exists in either
  direction between the host and the applicant, whether the acceptance is by the host (applicant-
  initiated) or by the invited player (host-initiated), and MUST leave the posting's seats, roster,
  and any conversation unchanged (atomic refusal).
- **FR-005**: All four guards MUST use the existing single, bidirectional active-block check; this
  feature MUST NOT introduce a second block-checking mechanism or change the block check's semantics,
  the blocks data, or the block/unblock flow.
- **FR-006**: Every refusal MUST use a neutral, per-path message that does not disclose that a block
  exists or its direction.
- **FR-007**: The guards MUST fail closed: if block status cannot be determined, the interaction MUST
  be refused, never allowed, and MUST surface as a graceful failure rather than an unhandled error.
- **FR-008**: Refused interactions MUST have no side effects — no notification, no seat/roster change,
  no conversation, no persisted application or question.
- **FR-009**: The feature MUST preserve all existing non-block behavior of the four paths: seat/roster/
  transaction logic, the applicant-vs-host acceptance authorization, the host-may-ask-own-listing
  allowance, input validation, and best-effort notifications on successful (non-refused) actions.

### Key Entities *(include if feature involves data)*

- **Block**: an active block relationship between two users (directional record, but enforced
  symmetrically). Read-only for this feature — it is the input to every guard, never modified here.
- **Application / Question**: the interaction records created by the guarded paths. This feature adds a
  precondition (no active block) to their creation; it does not change their shape or retroactively
  remove existing ones.
- **Posting (listing/party)**: supplies the host identity each guard compares the acting user against.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of apply / ask / invite / accept attempts between two players with an active block
  (in either direction) are refused (today: 0% — all four succeed).
- **SC-002**: 0 applications, questions, invitations, or roster/seat changes are persisted for a refused
  interaction.
- **SC-003**: 100% of the same interactions between players with no active block still succeed
  (no regression), and succeed again after an unblock.
- **SC-004**: 0 refusal messages disclose the existence or direction of a block.
- **SC-005**: The block guarantee holds identically in both block directions across all four paths.

## Assumptions

- **One shared check is sufficient.** The existing bidirectional active-block check is the single source
  of truth for "may these two interact"; each guarded path calls it rather than reimplementing the query.
- **Blocks are enforced symmetrically.** A block record is directional, but for interaction purposes an
  active block in either direction refuses the interaction (matching how messaging already behaves).
- **New interactions only.** Guarding is forward-looking; interactions that predate a block are out of
  scope (no retroactive cleanup).
- **The four listed paths are the scope.** Apply, ask, invite, and accept are the party/listing
  interaction write paths identified as unguarded; other surfaces (follow, report, forum) are separate
  decisions.

## Out of Scope

- **Follow and report flows** — a report is a safety valve one may need *because* of a block, and follow
  is a distinct interaction; a block-vs-follow/report policy is a separate decision (logged to future
  work).
- **A generic block-check middleware/decorator** — the guard is a direct call at each site, matching the
  existing messaging guard; no new abstraction.
- **Retroactively removing** applications/questions/roster memberships created before the block.
- **Any change** to the block check's semantics, the blocks table, or the block/unblock (008) flow.
- **Forum write paths** — a separate surface, not part of this feature.
- **The `applications` uniqueness race** (a separate tech-debt item) — even though it touches the same
  files, it is tackled independently.
