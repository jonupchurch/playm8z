# Research: Notification Wiring

Decisions resolved before design. Each is grounded in code read on 2026-07-17.

## 1. The `@mention` grammar is bound to the real handle format

**Decision**: Parse mentions with `/(?<![A-Za-z0-9])@([A-Za-z][A-Za-z0-9]{0,23})/g`,
then dedupe case-insensitively and resolve each token against `users.handle`
case-insensitively. Unknown tokens are dropped.

**Rationale**: The handle format is `^[a-zA-Z][a-zA-Z0-9]{0,23}$`
(`src/lib/validations/auth.ts` `handleSchema`, mirrored in
`onboarding.ts`) — letter-first, letters/numbers only, no underscores, max 24.
Matching exactly that character class after `@` means the token naturally stops
at the first non-handle character, so `@carol.` captures `carol` and `@carol_x`
captures `carol`. The negative-lookbehind `(?<![A-Za-z0-9])` prevents matching
inside an email address (`carol@example.com` — the `@` is preceded by `l`) and
inside a longer word. Lookbehind is supported on the Node runtime this app
targets.

**Alternatives considered**: A looser `@(\w+)` — rejected: `\w` includes `_`,
which no handle can contain, and without the lookbehind it would fire inside
emails. Storing parsed mentions as a join table — rejected: handles are unique
and immutable, so resolving transiently at write time is sufficient and adds no
schema (spec Assumptions).

## 2. Reply vs. mention dedupe = recipient exclusion, reply wins

**Decision**: In `post-reply.ts`, notify the thread author first (`reply`), then
notify mentions **excluding** both the actor and the thread author. In
`create-thread.ts`, notify mentions excluding only the actor.

**Rationale**: Spec FR-005 requires at most one notification per recipient per
post, with `reply` taking precedence over `mention`. Excluding the thread author
from the mention pass is the whole mechanism — no cross-checking of already-sent
notifications is needed. Excluding the actor covers self-mention and
self-reply (FR-003 / edge cases). Repeated mentions of one handle collapse
because the parser dedupes tokens.

## 3. Accept/decline notify the applicant ONLY for applicant-initiated requests

**Decision**: Emit the `accepted` / `declined` notification (recipient =
`application.applicantId`, actor = the host = the acting user) **only when
`application.initiatedBy !== "host"`**. Skip it for host-initiated invites.

**Rationale**: Both `accept-request.ts` and `decline-request.ts` carry a Public
Profile (022) reversal: for a host-initiated invite (`initiatedBy === "host"`)
the acting user is the *invited applicant*, not the host. In that flow, notifying
the applicant about their own accept/decline is nonsensical, and the host is
already covered — the host's live request synthesis (`get-notifications.ts`,
`postings.hostId === userId`) shows the resolved state, and accept also posts a
system message into the new conversation (037's Messages badge bumps). So only
the normal applicant-initiated flow needs a new applicant-facing bell entry. This
also guarantees no duplication with the host's synthesized view (spec FR-012),
because the recipient is always the applicant, never the host.

**Alternatives considered**: Always emit and rely on recipient filtering —
rejected: in the invite flow the applicant is the actor, so it would notify the
actor about their own action.

## 4. Notification content shape reads correctly under the row's forced actor prefix

**Decision**: For every produced notification set `actorId` to the causing user
and write `text` as a predicate that follows a bold `@handle`:

| type       | recipient      | actorId        | text                                         | targetRef                |
|------------|----------------|----------------|----------------------------------------------|--------------------------|
| `reply`    | thread author  | replier        | `replied to your thread “{title}”`           | `/forum/thread/{id}`     |
| `mention`  | mentioned user | poster         | `mentioned you in “{title}”`                 | `/forum/thread/{id}`     |
| `accepted` | applicant      | host           | `accepted your request to join {game · title}` | `/listing/{postingId}` |
| `declined` | applicant      | host           | `declined your request to join {game · title}` | `/listing/{postingId}` |

**Rationale**: `PlainRow` in `notifications-list.tsx` renders
`<b>@{actorHandle ?? "playm8z"}</b> {text}`, so the text must be a verb phrase.
Giving `declined` a real actor (the host) renders "@host declined your request to
join …", which is clearer and symmetric with `accepted` — this refines the spec's
illustrative "Your request … was declined" wording, which the spec flagged as
"something like". Every type has a non-null actor, so the avatar always renders.

## 5. `declined` type threads through exactly two display maps

**Decision**: Add `declined` to (a) the `NotificationType` union in
`create-notification.ts`, (b) `categoryOf()` in `filter-notifications.ts` as a
`"requests"` item (alongside `accepted`/`join`), and (c) `TYPE_ICON` in
`notifications-list.tsx` with a distinct icon/color (e.g. `✕` on a muted-red
background, contrasting the green `✓` `accepted`).

**Rationale**: `categoryOf` currently returns `null` for any unknown type, which
would drop `declined` from the Requests filter chip; `TYPE_ICON[item.type] ??
TYPE_ICON.system` would render it with the generic 🔔. Both are the concrete
"handle the new type gracefully" work FR-008 requires. `declined` belongs in the
Requests bucket because it is a party-request outcome.

## 6. Best-effort seam: swallow-and-log, and outside the transaction for accept

**Decision**: The notify module's public functions never throw — each wraps its
work in `try/catch` and `console.error`s on failure, returning `void`. Callers
`await` the emitter after the primary write has succeeded. In `accept-request.ts`
the emitter is called **after** `db.transaction(...)` resolves, never inside it.

**Rationale**: Spec FR-010/FR-011 and Constitution Principle V (transaction seam).
`accept-request.ts` updates request status, seat count, and creates the
conversation in one transaction whose partial failure would corrupt capacity
accounting; a notification insert must never be able to roll that back. Awaiting
(rather than fire-and-forget) is deliberate — serverless can kill work that
outlives the response, and the emitter is cheap. Because the emitter swallows its
own errors, awaiting it cannot fail the action.

## 7. Testing approach & ripple

**Decision**: Unit-test `extractMentionHandles` purely. Integration-test the
emitters and each retrofitted action against the real DB (mock only `@/auth`,
seed real users/threads/postings, per the established pattern in
`post-reply.test.ts`). Each action test adds: correct-recipient assertion,
self/blocked/unknown-skip assertions, dedupe assertion, and a
"primary action still succeeds when the notification write throws" assertion
(inject a failure, e.g. spy `createNotification` to reject, and confirm the reply/
accept/decline still returns success and persisted).

**Rationale**: Project memory — adding a new DB write into actions that already
have test files ripples into those files (as `logAuditEntry` did). Notification
rows are cleaned up automatically where the recipient is a seeded user (the
`notifications.userId` FK is `onDelete: cascade`, so the existing
`db.delete(users)` in `afterAll` removes them); tests that create notifications
for non-deleted users must clean up by a run-scoped token. Most existing
`post-reply`/`create-thread` tests reply/post as the thread author themselves, so
self-exclusion means they create no notification and need no change beyond
tolerating the new code path.
