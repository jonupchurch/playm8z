# Quickstart / Validation: Connect Steam & import library (038)

Proving the feature works end-to-end.

## Prerequisites

- Local Postgres with the schema, plus the two new `users` columns applied (`drizzle-kit push`; verify `steamId`/`steamConnectedAt` exist by querying).
- Dev server (`npm run dev`; kill any stale server on port 3000 first).
- A signed-in account.
- `STEAM_API_KEY` set locally **only if** you want to hit real Steam; otherwise the automated tests simulate Steam and no key is needed.
- For a real manual test: a Steam account whose **game details are public** (Steam → Profile → Edit → Privacy → Game details = Public).

## Manual validation (against real Steam)

1. **Connect**: Account settings → Connect Steam → approve on Steam → return to account settings showing "Connected." Confirm `users.steamId` is set for your account.
2. **Ownership is real**: the linked SteamID matches your Steam account (not something typed).
3. **Import — review**: click Import library → see your games most-played first, with recently-played ones pre-checked; games already on your profile are shown as "already added" (not selectable).
4. **Import — commit**: select a few, confirm → exactly those appear on your profile with their playtime; your previously-listed games are untouched.
5. **No duplicates**: run Import again → games already added are not offered/duplicated; only genuinely new ones can be added.
6. **Curated image**: a selected game that matches a curated game (e.g. one of the seeded titles) shows its headline image on the profile.
7. **Private library**: flip your Steam game details to Private, Import again → a clear "we couldn't see your library — make it public or add manually" message, no error, nothing changed.
8. **Disconnect**: Disconnect Steam → settings shows not connected, `users.steamId` cleared — and the games you imported are **still on your profile**.
9. **Collision**: with a second test account, try to connect the same Steam account → refused with a clear message; neither account changes.

## Automated validation

- **Unit** (Vitest, Steam mocked): `verifyAssertion` returns null for a tampered/`is_valid:false` assertion and the correct SteamID64 for a genuine one; `getOwnedGames` maps a private-profile response to `[]` and playtime minutes→hours; `mergeLibrary` sorts by playtime, pre-marks recent, flags already-on-profile, dedups by normalized name — all with no I/O.
- **Integration** (real DB): connect writes `steamId`/`steamConnectedAt`; a second account connecting the same SteamID is refused (unique + friendly error); `importSteamGames` adds only new rows, never duplicates or touches hand-added games; `disconnectSteam` clears the link and leaves `userGames`.
- **E2E** (Playwright, Steam endpoints stubbed): connect → review (recent pre-checked) → select → confirm → games on profile; private-library message path; disconnect keeps imported games. Steam's OpenID + Web API are intercepted/stubbed — never the live site.

## Expected outcome

A signed-in player connects their Steam account (ownership verified server-side), chooses which real Steam games to add, and those games join their profile — augmenting their existing list, never duplicating, with playtime filled and curated images lighting up — while sign-in, email, and eligibility are untouched.
