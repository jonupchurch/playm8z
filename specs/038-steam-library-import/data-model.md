# Data Model: Connect Steam & import game library (038)

One schema change (two nullable columns on `users`). No new table; imported games are ordinary `userGames` rows.

## Changed: `users` (two new columns)

| Field | Type | Notes |
|-------|------|-------|
| `steamId` | text, **unique**, nullable | The verified SteamID64. `null` = not connected. Unique so one Steam account links to at most one playm8z account (FR-003); the unique index is the race backstop behind the app-level collision check. |
| `steamConnectedAt` | timestamp (mode `date`), nullable | When the link was made. `null` when not connected. |

Both are cleared to `null` on disconnect (FR-008). No other `users` fields change; sign-in methods, email, verification, and age eligibility are untouched (FR-012).

## Reused (unchanged): `userGames`

| Field | Type | Role for this feature |
|-------|------|-----------------------|
| `userId` | uuid FK | the importing player |
| `game` | text (free) | the Steam-reported game **name** (no app id stored) |
| `rank` | text, nullable | always `null` for imports (Steam has no cross-game rank) |
| `hoursPlayed` | int, nullable | `round(playtime_forever_minutes / 60)` from Steam |
| `createdAt` | timestamp | insert time |

An imported row is indistinguishable from a hand-added one after the fact — both are managed by the existing `addUserGame`/`removeUserGame`. Dedup on insert is by `normalizeGame(game)` (lowercase+trim) against the player's current rows.

## Transient (not persisted): library snapshot

Read from Steam at review time, never stored:

```
OwnedGame     = { appid, name, playtimeMinutes }        // GetOwnedGames
RecentGame    = { appid }                                // GetRecentlyPlayedGames (for pre-select)
ReviewItem    = { name, hoursPlayed, recentlyPlayed, alreadyOnProfile }   // merge-library output, sorted by hours desc
```

Only the `ReviewItem`s the player selects become `userGames` rows. `appid` is used solely to merge/de-dup the owned+recent lists in memory and is discarded.

## State: connection lifecycle

```
not connected  --(connect: OpenID verified, no collision)-->  connected
connected      --(disconnect)-->  not connected            // userGames rows remain
connected      --(import)-->      connected                // adds userGames; link unchanged
(any)          --(connect w/ SteamID already on another user)-->  refused, unchanged
```

## Derived / validation rules

- **Collision**: connect fails if `steamId` already exists on a different user → friendly refusal, nothing written (FR-003).
- **Private/empty library**: a connected player whose owned-games read is empty/withheld gets the "make details public / add manually" message; import writes nothing (FR-007).
- **Dedup**: `importSteamGames` inserts a game only if no existing `userGames` row for that user normalizes to the same name (FR-005, FR-009).
