# Research: Enforce blocks on party/listing interactions

Phase 0 decisions.

## 1. Reuse `hasActiveBlockBetween` — one guard, called at each site

**Decision**: Import and call the existing `hasActiveBlockBetween(a, b)` (`@/lib/inbox/search-contacts`)
at each of the four write paths. No new helper, no change to its semantics, no `blocks` schema change.

**Rationale**: It is already the canonical, bidirectional, active-only check used by messaging and
notifications; a second mechanism would be the exact "shared mechanism applied inconsistently" problem
this feature fixes. The spec forbids a generic middleware/decorator — a direct call per site matches
`start-conversation.ts` and keeps each refusal message local to its path.

**Alternatives**: a shared decorator/interceptor (rejected — over-abstraction, spec out-of-scope); re-query
`blocks` inline per site (rejected — duplicates the helper's logic, drift risk).

## 2. Per-site relationship and placement

**Decision**:
- `apply-to-posting.ts`: after the posting is loaded (has `hostId`), before the existing-application check —
  `hasActiveBlockBetween(applicant.id, posting.hostId)`.
- `ask-question.ts`: load the posting first (see #4), then `hasActiveBlockBetween(asker.id, posting.hostId)`.
- `invite-to-party.ts`: after the self/posting/seat checks — `hasActiveBlockBetween(host.id, invitedUserId)`.
- `accept-request.ts`: inside the transaction, after loading the application + posting —
  `hasActiveBlockBetween(application.applicantId, posting.hostId)`; on a block, `throw` (rolls back).

**Rationale**: Each site already has (or, for ask, will load) both user ids at that point. Placing the guard
alongside the existing precondition checks keeps it in the natural "may this proceed?" section. The check keys
on the two humans who would end up in contact — never on the acting user alone.

## 3. Symmetric, and fail-closed with a graceful (non-500) refusal

**Decision**: The guard is symmetric (the helper already checks both directions). It fails closed: if the
block lookup itself errors, the interaction is refused with a graceful failure result, never allowed and never
an unhandled 500.
- `accept-request` already wraps its transaction in `try/catch` that converts a throw into
  `{ success:false, error }` — a lookup error there is already graceful + fail-closed (the write never happens).
- `apply-to-posting`, `ask-question`, `invite-to-party` have no `try/catch` around their main logic. Wrap the
  block call so an error returns a graceful generic failure (`"Something went wrong. Please try again."`) —
  distinct from the neutral block message, so a transient DB error doesn't falsely claim a block, yet still
  refuses (fail-closed). Since the guard is BEFORE the write, refusing on error means no interaction is created.

**Rationale**: FR-007. A block guard that fails open (allows on error) or 500s (bypassing the graceful-refusal
contract) are the two classic mistakes; both are avoided. The generic message keeps a transient error from
leaking as (or being confused with) a block.

**Alternatives**: reuse the neutral block message on error (rejected — mildly misleads the user into thinking
they're blocked on a transient DB hiccup); no error handling / let it 500 (rejected — violates the graceful
contract, and an unhandled throw is a worse UX than a "try again").

## 4. `ask-question` gains a posting-existence load

**Decision**: `ask-question` currently inserts a `questions` row from `postingId` + `askerId` without loading
the posting. To key the block on the host, it must load the posting (`hostId`), which also adds a missing
"posting exists" guard (refuse a question on a non-existent listing).

**Rationale**: The host id is required for the block check and isn't otherwise available. The existence guard is
a free, correct side benefit (today a question on a bogus `postingId` would rely on the FK to reject, an
ungraceful 500). The host-asks-own-listing allowance is preserved: a self pair is never blocked.

## 5. accept-request reads `blocks` via `db` inside the transaction

**Decision**: Inside `accept-request`'s `db.transaction`, call `hasActiveBlockBetween` (which uses the global
`db`, a separate pooled connection) rather than threading `tx`. The block state is a stable read not mutated by
the transaction, so reading it outside the txn's isolation is correct; a block → `throw` → the txn rolls back
with no seat/roster/conversation change.

**Rationale**: `blocks` is not written in this transaction, so there's no read-your-writes concern; reusing the
helper unchanged is simpler than adding a `tx` parameter to it (which would touch the messaging path too, out of
scope). The atomic refusal (FR-004/FR-008) is guaranteed by the throw rolling back the transaction.

**Alternatives**: thread `tx` into a new helper overload (rejected — widens the change to the shared helper and
the messaging path for no correctness gain); check the block before the transaction by pre-loading the
application (rejected — duplicates the application/posting load the txn already does).

## 6. Neutral, per-path refusal messages

**Decision**: `apply` → "You can't apply to this listing."; `ask` → "You can't ask a question on this
listing."; `invite` → "You can't invite this player."; `accept` → "You can't accept this request." None
disclose a block or its direction (matching `start-conversation`'s "You can't message this person.").

**Rationale**: FR-006. Confirming a block (or its direction) leaks that the other person blocked them, which is
itself unwanted signal. A flat "you can't" is the established convention.

## 7. CHANGELOG / Patch Notes

**Decision**: Update `CHANGELOG.md` + `status.md`. This has a genuine player-facing guarantee — "someone you
blocked can no longer apply to, question, or join your party" — so it gets a user-facing CHANGELOG line and a
live Patch Notes prod post per the standing workflow. Also add a future-work note that block-vs-follow and
block-vs-report policies remain unresolved (deliberately out of scope here).
