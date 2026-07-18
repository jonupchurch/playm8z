# Contracts: block guards

Internal seam changes only. No HTTP/UI contract changes; each action keeps its existing return type.

## Shared guard (reused, unchanged)

`hasActiveBlockBetween(userIdA: string, userIdB: string): Promise<boolean>` — true iff an active
(`unblockedAt IS NULL`) block exists in either direction. Source of truth; not modified.

## `applyToPosting(postingId, { message? }): ApplyResult` — `{success:true} | {success:false;error}`

- After loading the posting (existing), before the existing-application check: fail-closed block guard on
  `applicant.id ↔ posting.hostId`.
- Active block → `{ success:false, error:"You can't apply to this listing." }`, no `applications` insert.
- Block lookup error → `{ success:false, error:"Something went wrong. Please try again." }` (fail-closed).
- Otherwise unchanged.

## `askQuestion(postingId, { text }): AskResult`

- **New**: load the posting; if absent → `{ success:false, error:"This listing no longer exists." }`.
- Fail-closed block guard on `asker.id ↔ posting.hostId`. Active block →
  `{ success:false, error:"You can't ask a question on this listing." }`, no `questions` insert.
- Host asking own listing still succeeds (self pair is never blocked).
- Block lookup error → graceful generic failure (fail-closed).

## `inviteToParty(input): InviteToPartyResult`

- After the existing self/posting/seat checks: fail-closed block guard on `host.id ↔ invitedUserId`.
- Active block → `{ success:false, error:"You can't invite this player." }`, no `applications` insert.
- Block lookup error → graceful generic failure (fail-closed).

## `acceptRequest({ applicationId }): AcceptRequestResult`

- Inside the existing `db.transaction`, after loading application + posting: block guard on
  `application.applicantId ↔ posting.hostId`.
- Active block → `throw new Error("You can't accept this request.")` → transaction rolls back (seats, roster,
  conversation, application status all unchanged) → existing catch returns `{ success:false, error }`.
- A block-lookup throw is likewise caught by the existing transaction try/catch (fail-closed, graceful).
- Best-effort notification only fires on a successful (non-refused) accept.

## Invariants across all four

- Symmetric (either block direction refuses).
- Fail-closed (lookup failure refuses, gracefully, never allows).
- Neutral messages (no disclosure of a block or its direction).
- No side effects on refusal (no notification, no persisted row, no seat/roster change).
