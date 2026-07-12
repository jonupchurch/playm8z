# Phase 0 Research: Inbox / messaging

## 1. Lazy Conversation creation, avoiding a Listing detail amendment

**Decision**: a pending Application's own `message` field displays as
the request thread's opening line; no `Conversation`/`Message` row
exists for it until the host accepts, at which point `accept-request.ts`
creates a real `Conversation` (members: host + applicant) and a system
message recording the acceptance.

**Rationale**: `Conversation`/`Message` don't exist from Listing
detail's (`006`) own vantage point — that feature was specced before
this one defines them. Rather than retroactively amending an already-
merged feature to reach forward into an entity it couldn't have known
about, this feature's own list query simply unions two sources (real
conversations, and pending Applications where the current user hosts
the posting) — avoiding the amendment entirely, unlike the `SavedListing`
correction (which was a case where the earlier feature's own button
had no working effect at all without amendment). Here, Listing detail's
apply flow already works exactly as specced; this feature just gives
its output a second home in the inbox.

**Alternatives considered**: amending `006-listing-detail`'s
`apply-to-posting.ts` to create a `Conversation` immediately — rejected,
unnecessary churn to an already-correct, already-merged feature when
the lazy/merged-list approach gets the same user-facing result.

## 2. No websocket layer — `router.refresh()` polling instead

**Decision**: the active conversation's Client Component wrapper calls
`router.refresh()` on a short interval (a few seconds) while mounted,
re-running the Server Component fetch — not a persistent WebSocket
connection.

**Rationale**: keeps this feature's infrastructure footprint to
"another Server Component route," consistent with every feature so
far, rather than introducing the project's first persistent-connection
requirement as a side effect of shipping messaging. Vercel Functions do
support WebSockets, so this isn't a platform limitation — just a
deliberate scope boundary, logged to `docs/future-work.md`.

**Alternatives considered**: a WebSocket-based live-push channel —
rejected as a real, first-of-its-kind infrastructure commitment better
made as its own deliberate upgrade later, not folded into this
feature's initial scope; a longer poll interval or none at all —
rejected as materially worse UX for a messaging feature specifically,
where "did they reply yet" is the central question.

## 3. Accepting a request is one atomic transaction

**Decision**: `accept-request.ts` updates `applications.status`,
decrements `postings.seatsOpen` (and sets `postings.status = 'full'`
if it reaches zero), and creates the new `conversations` row inside a
single database transaction.

**Rationale**: these three effects must all happen or none should —
a partial failure (e.g., the Application flips to accepted but the
seat count doesn't decrement) would silently corrupt the posting's
capacity accounting, exactly the kind of "seam with real risk of
silent breakage" Principle V calls out for integration-test coverage.

**Alternatives considered**: three independent writes with best-effort
sequencing — rejected, a mid-sequence failure would leave inconsistent
state with no way to detect it later.

## 4. Contact search excludes blocked/blocking users

**Decision**: `search-contacts.ts` queries the existing `blocks` table
(`008-blocked-users`) directly to exclude anyone with an active block
relationship with the current user, in either direction; `send-message.ts`
and `start-conversation.ts` re-check the same relationship server-side
before allowing a new conversation or message to a specific person.

**Rationale**: this is the first feature to actually consult the Block
relationship Blocked Users defined and explicitly left for "each
feature to enforce itself" — messaging is exactly the interaction that
feature's own info callout promises blocking prevents ("They can't
message you").

**Alternatives considered**: relying on the compose search's exclusion
alone — rejected, the same client-side-isn't-enough reasoning applied
throughout this project (e.g., Post a Game's stepper re-validation).
