# Implementation Plan: Connect Steam & import game library

**Branch**: `038-steam-library-import` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/038-steam-library-import/spec.md`

## Summary

Let a signed-in player link their Steam account from account settings (ownership proven by a Steam OpenID 2.0 approval, **server-verified**), then import selected games from their Steam library into the existing `userGames` list — augmenting, never replacing, and de-duplicating by normalized name, with Steam playtime filling `hoursPlayed`. Steam is integrated as a **settings-time account link, not an Auth.js sign-in provider and not a login method** ([ADR 0012](../../docs/adr/0012-steam-account-link-via-settings-openid.md)). One schema change (two nullable columns on `users`), a small server-side Steam client, two route handlers for the OpenID handshake, an import review-and-select action + UI, and a "Connect Steam" account-settings section.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router (repo-pinned; read `node_modules/next/dist/docs/` before touching route/handler APIs)

**Primary Dependencies**: Auth.js v5 (session only — Steam is NOT a provider), Drizzle + postgres.js, Zod (callback + import validation). Steam is reached over plain HTTPS `fetch` — **no new npm dependency** (OpenID verification and the Web API are simple request/response; a heavyweight `openid` library is deliberately avoided, see research.md #1).

**Storage**: PostgreSQL via Drizzle. **New**: `users.steamId` (text, unique, nullable) + `users.steamConnectedAt` (timestamp, nullable). Reuses `userGames`. No new table.

**Testing**: Vitest (SteamID extraction + OpenID-verification rejection of a forged assertion; import dedup/playtime mapping; collision refusal) + Playwright (connect happy-path and import review, with Steam's endpoints stubbed). Steam is fully simulated in tests — no real key, mirroring the AI Gateway/Blob mock pattern. The Steam client's base URLs are injectable so tests point at a fake (research.md #6).

**Target Platform**: Web (account-settings flows; no hot-path Steam calls)

**Project Type**: Web application (single `src/`)

**Performance Goals**: Steam is called only on explicit player action (connect, import) — never on page render (FR-010). Import reads at most two Steam endpoints per click.

**Constraints**: The OpenID return is attacker-controlled and MUST be verified server-side before the SteamID is trusted (FR-002, Constitution Principle II). `STEAM_API_KEY` is server-only, never shipped to the client (FR-010).

**Scale/Scope**: One migration (2 columns), ~1 client module, 2 route handlers, 2–3 server actions, 1 settings section + 1 import review component. Medium.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development & Legible Architecture** — PASS with an ADR. This introduces a real architectural decision (integrate Steam via a custom, settings-time OpenID link rather than an Auth.js provider; store the SteamID on `users`), so **ADR 0012 is authored alongside the plan**. Spec/plan/tasks are produced in order; CHANGELOG/status updated (Principle VI).
- **II. Validated Trust Boundaries** — PASS, and this is the feature's center of gravity. The OpenID callback params are validated with Zod **and** the assertion is verified with Steam (`check_authentication` round-trip) before any link is written — a claimed SteamID is never trusted on the client's say-so. Connect requires an authenticated session (`requireAuth`) and links only to that session's user. The import-commit action Zod-validates the selected games. `STEAM_API_KEY` is read server-side only.
- **III. Designed, Accessible Experience** — PASS. Every state is designed: not-connected, connected, importing (loading), the review list (empty, private-library, Steam-unavailable, and the normal selectable list), and errors (verify-failed, already-linked-elsewhere). The review list is a keyboard-operable labeled checkbox list; non-color status.
- **IV. Scope Discipline** — PASS. Sharp out-of-scope boundary: no sign-in-with-Steam, no live status, no Steam avatar, no achievements/friends, no auto-sync, no non-Steam stores, no `steamAppId` on the curated games table. Those are logged to future-work.
- **V. Test Discipline** — PASS. The security-critical path (reject a forged/tampered assertion; never trust an unverified SteamID) gets explicit tests; dedup/mapping/collision get unit + integration tests; connect + import get e2e with Steam stubbed. CI green before merge.
- **VI. Legible History** — PASS. Conventional commits, atomic per task, ADR 0012, CHANGELOG + status.

**One complexity item to justify (below), no violations.**

## Project Structure

### Documentation (this feature)

```text
specs/038-steam-library-import/
├── plan.md · spec.md · research.md · data-model.md · quickstart.md
├── contracts/steam-connect-and-import.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
src/
├── db/schema.ts                                 # EDIT: users.steamId (unique), users.steamConnectedAt
├── lib/steam/
│   ├── steam-openid.ts                          # NEW: build redirect URL; verify assertion (check_authentication); extract SteamID64
│   ├── steam-openid.test.ts                     # NEW: forged/tampered assertion rejected; SteamID extraction
│   ├── steam-client.ts                          # NEW: GetOwnedGames + GetRecentlyPlayedGames (injectable base URL, server-only key)
│   ├── steam-client.test.ts                     # NEW: private profile -> empty; playtime(min)->hours; shape
│   └── merge-library.ts                         # NEW: pure merge -> {name, hours, recentlyPlayed, alreadyOnProfile}, sorted by playtime
├── app/api/steam/
│   ├── connect/route.ts                         # NEW: GET, requireAuth -> redirect to Steam OpenID
│   └── callback/route.ts                        # NEW: GET, verify assertion, link (collision-checked), redirect to /profile/account?steam=...
├── lib/actions/
│   ├── steam-import.ts                          # NEW: readSteamLibrary() (for review) + importSteamGames(selected[]) (dedup + insert)
│   └── steam-disconnect.ts                      # NEW: disconnectSteam() -> clear steamId/steamConnectedAt (keeps userGames)
├── lib/validations/steam.ts                     # NEW: Zod for callback params + import payload
├── components/profile/
│   ├── steam-connect-section.tsx                # NEW: connect / connected+import / disconnect; rendered on /profile/account
│   ├── steam-import-dialog.tsx                  # NEW: review-and-select list (playtime-sorted, recent pre-checked)
│   └── games-list.tsx                           # EDIT (small): render curated image via existing GameImage/resolveGameImage (US2 scenario 6)
├── app/profile/account/page.tsx                 # EDIT: mount <SteamConnectSection>, pass connected state
└── app/profile/page.tsx                         # EDIT (small): resolve game images for the games list (reuses resolveGameImages)
```

**Structure Decision**: Standard `src/` web layout. Steam logic is isolated under `src/lib/steam/` (OpenID + Web client + pure merge), the handshake lives in `src/app/api/steam/` route handlers (a redirect round-trip can't be a Server Action), and user-facing writes are Server Actions in `src/lib/actions/`. The profile games-list image wiring reuses feature 035's `resolveGameImage`/`GameImage` — no new image linkage (FR-011).

## Complexity Tracking

| Complexity | Why needed | Simpler alternative rejected because |
|---|---|---|
| A custom OpenID 2.0 connect flow parallel to Auth.js (route handlers + hand-rolled verification), rather than an Auth.js provider | Steam authenticates via OpenID 2.0, which Auth.js has no provider for; and this is a **settings-time link on an existing session**, not a sign-in — so it deliberately does not touch the JWT/session machinery | (a) An Auth.js provider would make Steam a *login* method, dragging in the emailless-account problem this feature exists to avoid; (b) "paste your SteamID/vanity URL" needs no OpenID but **cannot prove ownership** — anyone could claim anyone's library (a security regression, fails FR-001/FR-002) |
