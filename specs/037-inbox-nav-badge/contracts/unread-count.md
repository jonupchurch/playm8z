# Contracts: Messages nav entry + unread badge (037)

Two internal contracts — a read helper and the nav UI. No external/public API.

## Read helper: `getUnreadMessageCount`

**Location**: `src/lib/inbox/get-unread-message-count.ts`

**Signature**:

```ts
export async function getUnreadMessageCount(userId: string): Promise<number>
```

**Contract**:

- **Input**: `userId` — an already-authenticated user id resolved server-side by the caller (`SiteHeader`) from the Auth.js session. Not client-supplied; no validation boundary here.
- **Output**: a non-negative integer — the count of unread direct/group messages for that user (see [data-model.md](../data-model.md) for the exact predicate).
- **Query budget**: at most **2** queries regardless of the user's conversation count. Zero conversations → returns `0` with a single query (short-circuits the second).
- **Parity guarantee**: for any user at any moment, the returned value equals the sum of the per-conversation `unreadCount`s that `getInboxList(userId)` would report for real conversations (excludes the request/invite pseudo-items). Achieved by using the identical membership predicate, threshold derivation (JS `Date` from `lastReadAt[userId]` or `createdAt`), and unread predicate (`createdAt > threshold` AND `senderId IS NULL OR senderId != userId`).
- **Scope**: counts messages only — never party join-requests or host invites.
- **Side effects**: none (pure read).

## Nav UI: `MessagesLink`

**Location**: `src/components/nav/messages-link.tsx`

**Signature**:

```tsx
export function MessagesLink({ unreadCount }: { unreadCount: number }): JSX.Element
```

**Contract**:

- Renders a link to `/inbox`, styled like the notification bell's button box.
- Shows a count badge iff `unreadCount > 0`; the badge label is `unreadCount > 99 ? "99+" : String(unreadCount)` (matches `notification-bell.tsx`).
- **Accessibility**: accessible name is `Messages, {unreadCount} unread` when `unreadCount > 0`, else `Messages`. The icon is `aria-hidden`; the badge is real text (never color-only).
- No interactivity, no dropdown — a server component. Clicking navigates to `/inbox`.

## Integration point: `SiteHeader`

- Only in the signed-in branch (after the user row is resolved), fetch `getUnreadMessageCount(user.id)` — concurrently with the existing `getNotifications` fetch where practical — and render `<MessagesLink unreadCount={…} />` immediately before `<NotificationBell />`.
- Signed-out branch is unchanged (no Messages entry).
- Maintenance mode already returns `null` before this point — unchanged.

## Removed: dropdown Inbox link

- `profile-menu.tsx` no longer renders the `/inbox` link. Profile and Log out remain.
