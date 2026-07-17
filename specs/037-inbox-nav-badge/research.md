# Research: Messages nav entry + unread badge (037)

Phase 0. The feature is small; the only real technical question is how to count unread messages in a way that (a) exactly matches the inbox page and (b) does not scale queries with conversation count. Everything else is a straightforward mirror of the existing notification bell.

## 1. How does the inbox page derive "unread", and how do we match it exactly?

**Decision**: Reuse `get-inbox-list.ts`'s exact predicate and threshold derivation, but collapse its per-conversation N+1 into a single aggregate.

**Findings** (from reading the real code):

`get-inbox-list.ts` (the inbox page's list) computes unread per conversation as:

```ts
const lastReadAtRaw = conversation.lastReadAt?.[userId];               // ISO string | undefined
const lastReadAt = lastReadAtRaw ? new Date(lastReadAtRaw) : conversation.createdAt;  // JS Date
// then, in SQL:
count(*) WHERE conversationId = c.id
             AND createdAt > lastReadAt                                // JS Date passed as a param
             AND (senderId IS NULL OR senderId != userId)
```

The critical detail: the threshold is computed in JS, but the **comparison happens in SQL** — drizzle passes the JS `Date` as a bound parameter against the `messages.createdAt` column (`timestamp without time zone`, mode `"date"`). So parity with the inbox is guaranteed *only* if we compute the threshold the same way (JS `Date`) and let SQL do the comparison the same way. Reimplementing the comparison as a raw-SQL JSONB cast would risk timestamp-representation drift (see #2) and is rejected.

The write side confirms the cursor format:
- `markConversationRead` and `sendMessage` both write `lastReadAt[viewerId] = new Date().toISOString()` (UTC, `Z`-suffixed) via a JSONB merge.
- Messages get `createdAt` from `defaultNow()` (DB `now()`), not an explicit JS value.

**`removedAt` (moderator-hidden messages)**: `get-inbox-list.ts`'s unread count does **not** exclude `removedAt IS NOT NULL` messages (only the per-conversation *view*, `get-conversation.ts`, hides them). To satisfy SC-002 (no drift between the nav badge and the inbox list), this helper matches that behavior exactly — it also does not filter `removedAt`. This is a deliberate consistency choice, not an oversight: if moderator-hidden messages should ever be excluded from unread counts, that must change in **both** `get-inbox-list.ts` and this helper together, and is out of scope here. Message moderation is rare (feature 019), so any practical difference is negligible.

**Alternatives considered**:
- *Single raw-SQL aggregate with `(lastReadAt ->> userId)::timestamp` + `COALESCE(..., createdAt)`*: would be one query, but the JSONB value is a UTC `Z` ISO string while `createdAt` is `timestamp without time zone`; `'…Z'::timestamp` strips the offset rather than converting, so the SQL comparison could disagree with the inbox's JS-`Date`-param comparison. Rejected — parity with the inbox (SC-002) outweighs saving one round trip.
- *Reusing `getInboxList` and summing its `unreadCount`s*: correct number, but it's the N+1 we're explicitly avoiding, plus it does three extra queries (requests, invites, per-conversation members) irrelevant to the badge. Rejected for the hot nav path.

## 2. How do we keep the query count fixed (not one-per-conversation)?

**Decision**: Two queries total. (1) Fetch the viewer's conversations (`id`, `lastReadAt`, `createdAt`) with `arrayOverlaps(memberIds, [userId])` — the same membership predicate `get-inbox-list` uses. (2) One aggregate over `messages` whose WHERE is `OR` of `(conversationId = c.id AND createdAt > thresholdₖ)` across those conversations, ANDed with the global `(senderId IS NULL OR senderId != userId)`.

**Rationale**: The per-conversation threshold differs (each conversation has its own read cursor), so a single flat `WHERE createdAt > X` can't express it. An `OR` of per-conversation clauses, with each threshold passed as a JS `Date` param, expresses it in **one** query and keeps the comparison mechanism identical to `get-inbox-list` (thus identical results). Query volume is a constant 2 regardless of conversation count (FR-006). If the viewer has zero conversations, skip query 2 and return 0 (avoids an empty `OR`).

**Alternatives considered**:
- *`VALUES (cid, threshold)` join*: equivalent single query; slightly more raw SQL to hand-build. The drizzle `or(...and(...))` form is type-safe and reads clearly. Rejected in favor of the drizzle-native OR.
- *Denormalized per-member unread counter column*: would make it one indexed read, but it's a schema change + a new write path to keep in sync on every send/read, far more surface than this feature warrants, and a fresh source of drift with the inbox. Rejected (over-engineering per Principle IV).

## 3. Nav entry: component shape and placement

**Decision**: A new `MessagesLink` **server** component — a plain `<Link href="/inbox">` styled like the bell's button box, with the same badge markup, rendered in `SiteHeader`'s signed-in action row immediately before `NotificationBell`. Order becomes: "Post a game" → Messages → Bell → ProfileMenu.

**Rationale**: Unlike the bell (a disclosure widget with a preview dropdown, hence a client component), the Messages entry has no interactivity — it just navigates. A server component is simpler, ships no client JS, and is sufficient. It reuses the bell's exact badge classes and the `count > 99 ? "99+" : count` cap so the two badges are visually identical (FR-005).

**Icon**: `✉️` — the same envelope the notification system already uses for `message`-type notifications (`TYPE_ICON.message` in `notification-bell.tsx`), so the metaphor is consistent across the two surfaces.

**Accessibility** (FR-008): `aria-label={count > 0 ? \`Messages, ${count} unread\` : "Messages"}`, exactly mirroring the bell's `aria-label` pattern. The numeric badge is visible text (not color-only); the icon is `aria-hidden`.

## 4. Removing the redundant dropdown link

**Decision**: Delete the `<Link href="/inbox">Inbox</Link>` item from `profile-menu.tsx`, leaving Profile + Log out. One primary entry point (the nav) instead of two (FR-009).

**Rationale**: With a first-class nav entry, the dropdown duplicate is redundant and splits the "where do I find messages" answer. Keeping only the nav entry is cleaner and matches how the bell has no dropdown-menu duplicate.

## 5. Data freshness

**Decision**: Compute at render, same as the notification bell (`SiteHeader` is a server component; the count reflects the DB at request time). No real-time/pushed updates.

**Rationale**: FR-010 and the notification bell precedent. The badge updates on the next navigation/render after messages are read or received, which is the established behavior on this site (the bell works identically). Real-time is explicitly out of scope.
