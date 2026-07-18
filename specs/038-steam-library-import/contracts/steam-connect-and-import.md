# Contracts: Connect Steam & import game library (038)

Internal contracts only — two route handlers (the OpenID redirect round-trip), the Steam server client, three server actions, and Zod schemas. No public API.

## OpenID handshake (route handlers)

### `GET /api/steam/connect`
- **Auth**: requires a session (`requireAuth`); a logged-out visitor is routed to log in.
- **Effect**: sets a short-lived signed `state` cookie, then **redirects** the browser to Steam's OpenID login (`checkid_setup`) with `return_to = <appUrl>/api/steam/callback` and `realm = <appUrl origin>`.
- **No DB writes.**

### `GET /api/steam/callback`
- **Auth**: requires a session (links to that user).
- **Input**: `openid.*` query params (attacker-controlled) + the `state` cookie. Zod-validated for shape; **not trusted until verified**.
- **Effect**: verifies the assertion with Steam (`check_authentication` → `is_valid:true`) and checks the `state`. On success, extracts the SteamID64 and links it to the session user unless it's already on another user.
- **Output**: redirect to `/profile/account?steam=connected` (ok) / `?steam=verify-failed` / `?steam=already-linked`. Never renders a page.
- **Guarantee (FR-002)**: an unverifiable/tampered assertion produces **no** link.

## Steam server client — `src/lib/steam/steam-client.ts`

```ts
// Server-only. Reads STEAM_API_KEY. Base URL injectable for tests.
getOwnedGames(steamId: string): Promise<{ appid: number; name: string; playtimeMinutes: number }[]>
getRecentlyPlayedAppIds(steamId: string): Promise<Set<number>>
```
- **Contract**: `getOwnedGames` returns `[]` (not throw) when the profile is private/empty. Throws only on a genuine transport/Steam-unavailable error (surfaced to the player as "try again later"). Never runs on a render path.

## OpenID helper — `src/lib/steam/steam-openid.ts`

```ts
buildAuthUrl(returnTo: string, realm: string): string
verifyAssertion(params: Record<string,string>): Promise<string | null>  // -> SteamID64, or null if not is_valid
```
- **Contract**: `verifyAssertion` returns a SteamID64 **only** after Steam confirms `is_valid:true`; any tamper/failure → `null`. Pure w.r.t. the DB; HTTP boundary is mockable.

## Merge — `src/lib/steam/merge-library.ts`

```ts
mergeLibrary(
  owned: { name: string; playtimeMinutes: number; appid: number }[],
  recentAppIds: Set<number>,
  existingGameNames: string[],
): { name: string; hoursPlayed: number; recentlyPlayed: boolean; alreadyOnProfile: boolean }[]
```
- **Contract**: pure, no I/O. Sorted by `hoursPlayed` desc. `alreadyOnProfile` via `normalizeGame` match against `existingGameNames`. `hoursPlayed = round(min/60)`.

## Server actions

### `readSteamLibrary(): Promise<ReviewResult>` — `src/lib/actions/steam-import.ts`
- `requireAuth`; requires a connected `steamId`. Returns `{ kind: "list", items }` / `{ kind: "private" }` / `{ kind: "empty" }` / `{ kind: "steam-unavailable" }`. Read-only.

### `importSteamGames(selected: {name,hoursPlayed}[]): Promise<Result>` — `src/lib/actions/steam-import.ts`
- `requireAuth`; requires a connected `steamId`. Zod-validate. Re-derives the already-present set server-side and inserts only new `userGames` rows (dedup by normalized name). Returns count added. Revalidates the profile.

### `disconnectSteam(): Promise<Result>` — `src/lib/actions/steam-disconnect.ts`
- `requireAuth`; clears `steamId` + `steamConnectedAt`. **Leaves** `userGames` untouched (FR-008).

## Zod — `src/lib/validations/steam.ts`
- `steamCallbackSchema`: the expected `openid.*` params (mode, claimed_id shape, signed, sig, etc.).
- `importSelectionSchema`: `{ name: string(1..100), hoursPlayed: int >= 0 }[]`, capped length.

## UI contract
- `steam-connect-section.tsx` on `/profile/account`: shows **Connect Steam** (link to `/api/steam/connect`) when not connected; when connected, shows the linked state + **Import library** + **Disconnect**. Surfaces the `?steam=...` redirect statuses.
- `steam-import-dialog.tsx`: labeled, keyboard-operable checkbox list (playtime-sorted, recent pre-checked, already-added disabled); confirm → `importSteamGames`. Empty/private/unavailable states rendered, never a raw error.
