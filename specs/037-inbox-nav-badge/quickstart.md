# Quickstart / Validation: Messages nav entry + unread badge (037)

How to prove the feature works end-to-end. No schema migration is needed (no DB changes).

## Prerequisites

- Local Postgres running with the app's schema (existing `conversations`/`messages` tables).
- Dev server: `npm run dev` (kill any stale server on port 3000 first — a hot-reloaded server across branch switches corrupts e2e).
- At least two seeded users who can message each other (any existing seed with two members works).

## Manual validation

1. **Entry point visible**: Sign in, load any page (Home, Browse, Forum). Confirm a **Messages** (✉️) entry sits in the top-right nav, immediately left of the 🔔 bell.
2. **One-click to inbox**: Click Messages → land on `/inbox`. (Was previously avatar-menu → Inbox, two clicks.)
3. **Badge appears on unread**: As user B, send user A a message. As user A, load any page → the Messages entry shows a badge with `1`. Do **not** open the conversation.
4. **Badge clears on read**: As user A, open that conversation, then navigate to another page → the badge is gone.
5. **Own messages never count**: As user A, send B a message; A's badge does not increment from A's own message.
6. **Zero state**: With everything read, the Messages entry shows **no** badge.
7. **Cap**: With >99 unread (seed many), the badge reads `99+` (same as the bell).
8. **Requests/invites excluded**: With a pending party join-request on a posting A hosts (and no unread messages), A's Messages badge stays empty, while the 🔔 bell reflects the request. (Messages = conversations only.)
9. **Signed-out**: Log out → no Messages entry (the whole action row, bell included, is absent). Logged-out header unchanged.
10. **Dropdown de-duplicated**: Open the avatar menu → it lists Profile and Log out only; the old **Inbox** item is gone.
11. **Accessibility**: With unread present, the Messages control's accessible name reads "Messages, N unread" (screen reader / devtools accessibility pane); with none, "Messages". Badge is legible text, not color-only.

## Automated validation

- **Integration** (`get-unread-message-count.test.ts`, Vitest, real DB): seed a conversation with messages from another member after the viewer's `lastReadAt` → assert the returned count; mark read (bump `lastReadAt`) → assert 0; assert the viewer's own messages and system (`senderId = null`) messages behave per the predicate; assert a viewer with zero conversations → 0; assert the number equals the sum of `getInboxList`'s real-conversation `unreadCount`s for the same viewer (parity, SC-002).
- **Component** (Vitest + Testing Library): `MessagesLink` renders a badge with the capped label when `unreadCount > 0`, no badge at `0`, links to `/inbox`, and carries the count-bearing `aria-label`.
- **E2E** (Playwright): signed-in user sees the Messages nav entry; receiving a message shows the badge and one click reaches `/inbox`; reading clears it on next render; signed-out header has no Messages entry; the avatar dropdown no longer contains an Inbox link; an axe check on the header passes.

## Expected outcome

A signed-in member always sees a Messages entry in the top nav with an accurate, capped, accessible unread-message badge, reachable in one click — with the count never disagreeing with the inbox page.
