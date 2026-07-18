# Contracts: notification parser + emitters

## `src/lib/notifications/parse-mentions.ts` (pure, client-safe)

```ts
// Extract @handle mentions from free text, deduped case-insensitively.
// Returns lowercased handle tokens (no leading @), in first-seen order.
// Grammar is bound to the handle format: @ + [A-Za-z][A-Za-z0-9]{0,23},
// not preceded by an alphanumeric (so it never fires inside an email or word).
export function extractMentionHandles(text: string): string[]
```

Contract:
- `extractMentionHandles("hi @Carol and @carol")` → `["carol"]` (dedup, lowercased).
- `extractMentionHandles("mail carol@example.com")` → `[]` (email guard).
- `extractMentionHandles("@carol.")` → `["carol"]` (stops at non-handle char).
- `extractMentionHandles("@1bad @_x")` → `[]` (must start with a letter; `_` invalid).
- `extractMentionHandles("")` → `[]`.
- Pure: no `db` import, unit-testable, safe for any bundle.

## `src/lib/notifications/notify-events.ts` (server-only, imports `db`)

Every function is **best-effort**: it performs its own self-exclusion, block
check, and resolution, and never throws — internal failures are `console.error`'d
and swallowed. Callers `await` after the primary write.

```ts
// Notify a thread's author that someone replied. No-op if replier is the
// author or a block exists between them.
export async function notifyForumReply(args: {
  threadId: string;
  threadTitle: string;
  threadAuthorId: string;
  replierId: string;
}): Promise<void>

// Notify each real, non-excluded, non-blocked user @mentioned in `body`.
// `excludeUserIds` always includes the actor; for replies it also includes the
// thread author (who receives the `reply` notification instead).
export async function notifyMentions(args: {
  actorId: string;
  threadId: string;
  threadTitle: string;
  body: string;
  excludeUserIds: string[];
}): Promise<void>

// Notify an applicant that their (applicant-initiated) request was resolved.
// Caller passes kind and the pre-resolved host/applicant/posting fields.
export async function notifyRequestResolved(args: {
  kind: "accepted" | "declined";
  applicantId: string;
  hostId: string;      // becomes actorId
  postingId: string;
  game: string;
  title: string;
}): Promise<void>
```

Contracts:
- `notifyForumReply`: creates exactly one `reply` notification unless
  `replierId === threadAuthorId` (→ none) or `hasActiveBlockBetween(replierId,
  threadAuthorId)` (→ none).
- `notifyMentions`: resolves `extractMentionHandles(body)` to users; for each
  resolved user not in `excludeUserIds` and not blocked-vs-actor, creates one
  `mention` notification. Duplicate handles and unknown handles produce nothing.
- `notifyRequestResolved`: creates exactly one notification of `kind` for the
  applicant (actor = host) unless `hasActiveBlockBetween(hostId, applicantId)`.
  Caller is responsible for only invoking it on applicant-initiated requests.

## Call sites

| File | Added call(s) |
|------|---------------|
| `post-reply.ts` | after reply insert + count update: `await notifyForumReply(...)`; `await notifyMentions({ excludeUserIds: [replierId, threadAuthorId], ... })` |
| `create-thread.ts` | after thread insert: `await notifyMentions({ excludeUserIds: [authorId], ... })` |
| `accept-request.ts` | after the transaction resolves, if `initiatedBy !== "host"`: `await notifyRequestResolved({ kind: "accepted", ... })` |
| `decline-request.ts` | after the status update, if `initiatedBy !== "host"`: `await notifyRequestResolved({ kind: "declined", ... })` |

Note: `post-reply.ts`/`accept-request.ts` currently `select` only some fields;
each will additionally read the thread author + title (reply) or the posting's
`game`/`title` (accept/decline) needed for the notification. `decline-request.ts`
already selects `applicantId` + `postingId`; it will additionally read the
posting's `game`/`title`.
