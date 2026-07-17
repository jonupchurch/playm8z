# Data Model: Messages nav entry + unread badge (037)

**No schema changes.** This feature adds no tables and no columns. It reads existing tables owned by feature 011 and derives a single number. Documented here for completeness and to pin the exact fields the count depends on.

## Entities used (existing, unchanged)

### `conversations` (read only)

| Field | Type | Used for |
|-------|------|----------|
| `id` | uuid | join key to `messages.conversationId` |
| `memberIds` | uuid[] | membership filter — `arrayOverlaps(memberIds, [userId])` selects the viewer's conversations (same predicate as `get-inbox-list.ts`) |
| `lastReadAt` | jsonb `Record<userId, ISO string>` | per-viewer read cursor; `lastReadAt[userId]` is the threshold when present |
| `createdAt` | timestamp (mode `date`) | fallback threshold when the viewer has no `lastReadAt` entry (never opened the conversation) |

Not read by this feature: `isGroup`, `name`, `lastMessageAt`. Group and direct conversations are treated identically for counting.

### `messages` (read only)

| Field | Type | Used for |
|-------|------|----------|
| `conversationId` | uuid | scope to the viewer's conversations |
| `senderId` | uuid \| null | exclude the viewer's own messages: `senderId IS NULL OR senderId != userId`. Null (system messages) counts as unread. |
| `createdAt` | timestamp (mode `date`) | compared `> threshold` (per its conversation) — the unread test |

Not read: `body`, `type`, `id`. **`removedAt` is intentionally not filtered** (see research.md #1) to stay identical to `get-inbox-list.ts`'s unread count and avoid drift (SC-002).

## Derived value

### Unread message count (not persisted)

A single non-negative integer per viewer:

```
count of messages m such that:
  m.conversationId ∈ { conversations c : userId ∈ c.memberIds }
  AND (m.senderId IS NULL OR m.senderId != userId)
  AND m.createdAt > ( c.lastReadAt[userId] as Date, else c.createdAt )   -- c = m's conversation
```

- **Zero conversations** → 0 (short-circuit; no second query).
- **Threshold derivation** is byte-for-byte the same as `get-inbox-list.ts` (JS `Date` from the ISO cursor, or `createdAt`), so the badge total equals the sum of the inbox list's per-conversation `unreadCount`s (SC-002).
- Consumed by the nav badge with the display cap `count > 99 ? "99+" : count` (matching `notification-bell.tsx`).

## Read helper contract

`getUnreadMessageCount(userId: string): Promise<number>` — see [contracts/unread-count.md](./contracts/unread-count.md).
