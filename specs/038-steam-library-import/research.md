# Research: Connect Steam & import game library (038)

Phase 0. The genuinely new/risky parts are the OpenID 2.0 handshake and its server-side verification (the trust boundary); the rest is a straightforward Web-API read + a de-duplicated write into an existing table.

## 1. Connecting Steam: OpenID 2.0, hand-rolled, no library

**Decision**: Implement the Steam OpenID 2.0 handshake directly with two route handlers and plain `fetch`; do **not** add an `openid` npm dependency, and do **not** make it an Auth.js provider.

**How it works** (Steam's published flow):
- **Initiate** (`GET /api/steam/connect`, requires a session): redirect the browser to `https://steamcommunity.com/openid/login` with `openid.ns=http://specs.openid.net/auth/2.0`, `openid.mode=checkid_setup`, `openid.identity` and `openid.claimed_id` = the OpenID identifier-select value, `openid.return_to=<app>/api/steam/callback`, and `openid.realm=<app origin>`. The `<app>` origin comes from the same canonical-URL helper email links use (`appUrl()`), so it's correct in prod (not localhost).
- **Callback** (`GET /api/steam/callback`, requires a session): Steam appends `openid.*` params including `openid.claimed_id=https://steamcommunity.com/openid/id/<steamid64>`. These are attacker-controllable, so they are **not trusted yet**.
- **Verify**: POST all returned `openid.*` params back to `https://steamcommunity.com/openid/login` with `openid.mode` changed to `check_authentication`. Steam replies with a body containing `is_valid:true` only if it genuinely issued that assertion. **Only on `is_valid:true`** do we extract the SteamID64 from `claimed_id` (regex the trailing 64-bit id) and proceed. Anything else → no link, redirect back with an error status.

**Rationale**: The `check_authentication` round-trip is the canonical, documented way to make Steam OpenID secure, and it's a few lines — hand-rolling keeps the trust boundary explicit and in our own tested code (Principle II) rather than behind a stale third-party lib. Making it a route-handler pair (not a Server Action) is required because it's a browser redirect round-trip.

**Session binding**: the callback links the verified SteamID to **the currently authenticated user** (`requireAuth()` in the callback) — the return carries no user identity of its own, so a link can only ever attach to the session that's present. A short signed `state`/nonce (set as a cookie on initiate, checked on callback) is added as CSRF hardening so a stray/replayed callback can't drive a link; it's belt-and-suspenders on top of the session requirement.

**Alternatives considered**:
- *Auth.js Credentials/custom provider wrapping OpenID*: would route through the sign-in machinery and make Steam a login method — the exact thing that reintroduces the emailless-account problem. Rejected (ADR 0012).
- *`openid`/`passport-steam` libraries*: built for Express/Passport and NextAuth v4; poor fit for App Router route handlers and an extra dependency to carry for ~30 lines of logic. Rejected.
- *Paste a SteamID / vanity URL + `ResolveVanityURL`*: no redirect, but proves nothing — anyone could enter anyone's SteamID and import a stranger's library. Rejected on security (FR-001/FR-002).

## 2. Storing the link

**Decision**: Two nullable columns on `users`: `steamId` (text, **unique**) and `steamConnectedAt` (timestamp). No new table, no adapter `account` row (that table is Auth.js's OAuth space; this isn't an OAuth provider).

**Rationale**: One Steam account ↔ at most one playm8z account is a `UNIQUE` constraint on `steamId`; a `null` means "not connected." Putting it on `users` keeps the single-value link where the rest of the account lives and avoids conflating it with Auth.js's provider accounts. Collision (the SteamID already on another user) is caught by the app-level check **and** the unique index as the race backstop — mirror the handle-uniqueness precedent (check then rely on the constraint; translate a `23505` into a friendly "that Steam account is already linked to another playm8z account").

**Migration**: `drizzle-kit push` (not `db:migrate`, which can silently no-op). Two brand-new columns are an unambiguous push (no rename prompt). Verify both columns landed by querying the DB directly afterwards, per the schema-change discipline in memory. Local then prod (prod schema reconciles on deploy via `vercel-build`'s push, but verify).

## 3. Reading the library: Steam Web API

**Decision**: A server-only `steam-client.ts` with two calls, keyed by `STEAM_API_KEY`:
- `GetOwnedGames` (`IPlayerService/GetOwnedGames/v1`, `include_appinfo=1` for names, `include_played_free_games=1`) → `response.games[] = {appid, name, playtime_forever}` (minutes). A **private** profile returns `response` with no `games` key (or empty) — that's the private/empty signal, not an error.
- `GetRecentlyPlayedGames` (`IPlayerService/GetRecentlyPlayedGames/v1`) → the small recent set, used to pre-select.

**Mapping**: `hoursPlayed = round(playtime_forever / 60)`. `rank` stays null (Steam has no cross-game rank). App IDs are used only to de-dup the two lists and are **not stored** (no `steamAppId` anywhere — image resolution is name-based, FR-011).

**Rationale**: These are the minimal endpoints for "what do you own / what have you played lately." Key stays server-side (FR-010). Base URL is injected via a module constant overridable in tests (see #6). Rate limits (100k/day/key) are irrelevant here because calls are user-triggered, not per-render.

## 4. The review-and-select merge

**Decision**: A pure `merge-library.ts` that takes owned games, the recent set, and the player's existing `userGames` names, and returns a display list: `{ name, hoursPlayed, recentlyPlayed, alreadyOnProfile }` sorted by playtime descending. The UI pre-checks `recentlyPlayed && !alreadyOnProfile`; `alreadyOnProfile` entries are shown disabled/marked ("already added") so the player sees them without being able to double-add.

**Commit** (`importSteamGames`): takes the selected `{name, hoursPlayed}[]`, Zod-validated, re-derives the "already present" set server-side (never trusting the client's `alreadyOnProfile`), and inserts only genuinely-new `userGames` rows (dedup by `normalizeGame(name)` against current rows). Idempotent by construction (FR-009).

**Rationale**: A pure merge is unit-testable without Steam or a DB. Re-checking dedup server-side at commit time closes the gap where the library changed between review and confirm, and keeps the trust boundary honest.

## 5. Showing curated images on the profile (US2 scenario 6 / FR-011)

**Decision**: The profile Overview games list currently renders game **names** only. Wire the existing `resolveGameImages` (035) in `profile/page.tsx` and render each entry through the existing `GameImage` component in `games-list.tsx` — a small addition that reuses the name-keyed resolver. No new game↔image linkage, no schema change.

**Rationale**: FR-011 says imported games "show that game's headline image through the existing image resolution." Since imported games are ordinary `userGames`, wiring the existing resolver into the one surface that lists them satisfies it for hand-added games too, at no extra coupling. Kept explicitly small so it doesn't balloon the feature.

## 6. Testing against Steam (unit + e2e)

**Decision**:
- **Unit**: `steam-openid.ts` and `steam-client.ts` take their HTTP boundary such that Vitest mocks `fetch` (or an injected fetcher). Tests assert: a forged/tampered assertion (Steam replies `is_valid:false`) yields **no** SteamID; a genuine one extracts the right SteamID64; a private-profile response maps to "empty, not error"; playtime→hours rounding; and `merge-library` dedup/sort/pre-select with no I/O at all.
- **Integration** (real DB): connecting writes `steamId`/`steamConnectedAt`; a second account connecting the same SteamID is refused (unique + friendly error); `importSteamGames` inserts only new rows and never duplicates or touches hand-added games; disconnect clears the link and leaves `userGames`.
- **E2E** (Playwright): stub Steam's endpoints — intercept the OpenID `login` and the Web-API hosts via Playwright routing (and/or point the injectable base URLs at a local fake) so the redirect "returns" a canned valid assertion and the library returns canned games. Then drive: connect → review list (recent pre-checked) → select → confirm → games appear on the profile; and the private-library message path. This mirrors the memory lesson about **stubbing third-party redirect/login chains rather than hitting the live site** (which is a flakiness trap).

**Rationale**: Steam must be fully simulated (no key in CI, no live dependency). Making the base URLs injectable is the seam that lets both unit mocks and e2e stubs work without special-casing production code.

## 7. Env + provisioning

**Decision**: Add `STEAM_API_KEY` to `.env.example` with a comment block matching the AI-Gateway/Blob entries (server-only; obtained free from `https://steamcommunity.com/dev/apikey`; tests mock Steam so no real value is needed locally/CI). It must be set in Vercel prod for real imports to work — flag this as a provisioning step the owner does once (like the Resend/AI keys). Nothing else to provision (no npm dep, no new external store).
