---
description: "Task list for 038 — Connect Steam & import game library"
---

# Tasks: Connect Steam & import game library

**Input**: Design documents from `specs/038-steam-library-import/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/steam-connect-and-import.md, quickstart.md

**Tests**: Included (Constitution Principle V). The security-critical path — reject a forged/tampered OpenID assertion, never trust an unverified SteamID — gets explicit tests, alongside dedup/mapping/collision and e2e with Steam stubbed.

**Organization**: By user story. US1 (connect) and US2 (import) are both P1; US3 (refresh/disconnect) is P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on an incomplete task
- **[Story]**: US1 / US2 / US3 (Setup/Foundational/Polish carry no story label)

## Path Conventions

Single-project `src/`. New Steam logic under `src/lib/steam/`; handshake in `src/app/api/steam/`; writes as Server Actions in `src/lib/actions/`. Tests co-locate; e2e in `e2e/*.spec.ts`. Steam is fully simulated in tests (no key).

---

## Phase 1: Setup

- [ ] T001 [P] Add `STEAM_API_KEY` to `.env.example` with a comment block matching the AI-Gateway/Blob entries: server-only, obtained free at `https://steamcommunity.com/dev/apikey`, required in prod for real imports, and unnecessary locally/CI because tests simulate Steam.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ Blocks every story — the link columns and shared validation.**

- [ ] T002 Add `steamId` (text, **unique**, nullable) and `steamConnectedAt` (timestamp mode date, nullable) to `users` in `src/db/schema.ts`. Run `drizzle-kit push` against local (NOT `db:migrate`, which can no-op); **verify both columns landed by querying the DB directly**. Two brand-new columns are an unambiguous push.
- [ ] T003 [P] Add `src/lib/validations/steam.ts`: `steamCallbackSchema` (the expected `openid.*` params — mode, ns, signed, sig, `claimed_id` shape) and `importSelectionSchema` (`{ name: string(1..100), hoursPlayed: int >= 0 }[]`, length-capped).

**Checkpoint**: schema + validation ready.

---

## Phase 3: User Story 1 — Connect a Steam account (Priority: P1) 🎯 MVP

**Goal**: A signed-in player links their Steam account from settings, ownership proven and server-verified; a duplicate link is refused.

**Independent Test**: From account settings, connect → approve on Steam → settings shows "Connected"; a forged return produces no link; the same Steam account can't link to two accounts.

### Tests for User Story 1

- [ ] T004 [P] [US1] Unit test `src/lib/steam/steam-openid.test.ts`: `verifyAssertion` returns `null` when Steam replies `is_valid:false` or params are tampered, and the correct SteamID64 on a genuine `is_valid:true`; `buildAuthUrl` produces the expected `checkid_setup` URL with the right `return_to`/`realm`. (HTTP boundary mocked.)

### Implementation for User Story 1

- [ ] T005 [P] [US1] `src/lib/steam/steam-openid.ts`: `buildAuthUrl(returnTo, realm)` and `verifyAssertion(params)` (posts back with `mode=check_authentication`, requires `is_valid:true`, extracts SteamID64 from `claimed_id`). Injectable fetch/base URL for tests. Never trusts params pre-verification.
- [ ] T006 [US1] `src/app/api/steam/connect/route.ts` (GET): `requireAuth`; set a short-lived signed `state` cookie; redirect to Steam using `appUrl()` for `return_to`/`realm` (correct in prod, not localhost).
- [ ] T007 [US1] `src/app/api/steam/callback/route.ts` (GET): `requireAuth`; Zod-validate params (`steamCallbackSchema`); check `state`; `verifyAssertion`; on success link `steamId`+`steamConnectedAt` to the session user, catching the unique-violation (`err.cause.code === "23505"`) → treat as already-linked. Redirect to `/profile/account?steam=connected|verify-failed|already-linked`. Never render a page.
- [ ] T008 [US1] `src/components/profile/steam-connect-section.tsx`: shows **Connect Steam** (link to `/api/steam/connect`) when not connected, and surfaces the `?steam=...` status messages. Mount it in `src/app/profile/account/page.tsx`, passing whether the user has a `steamId`.
- [ ] T009 [US1] Integration test `src/app/api/steam/callback` (or a linking helper) in a co-located test: a verified assertion writes `steamId`/`steamConnectedAt`; a second user connecting the same SteamID is refused (unique + friendly), neither account altered. Scope rows by a unique run-id; restore state in `finally`.
- [ ] T010 [P] [US1] E2E `e2e/steam-connect.spec.ts` (Steam OpenID stubbed via route interception / injected base URL): connect happy path → settings shows connected; verify-failed path shows the error, no link.

**Checkpoint**: a verified Steam link exists on the profile — demoable before import.

---

## Phase 4: User Story 2 — Import selected games (Priority: P1)

**Goal**: A connected player reviews their library (playtime-sorted, recent pre-checked) and adds selected games to their profile — augmenting, deduped, playtime filled — with curated images showing.

**Independent Test**: Connected + public library → import → select a few → they appear with playtime, existing games untouched, no duplicates; private library shows a clear non-error message.

**Depends on**: T002 (columns), T007 (a connected `steamId` to read for).

### Tests for User Story 2

- [ ] T011 [P] [US2] Unit tests: `src/lib/steam/steam-client.test.ts` (private-profile response → `[]`; `playtime_forever` minutes → hours; shape) and `src/lib/steam/merge-library.test.ts` (sort by playtime desc; `recentlyPlayed` pre-mark; `alreadyOnProfile` via `normalizeGame`; hours rounding) — all with no real I/O.

### Implementation for User Story 2

- [ ] T012 [P] [US2] `src/lib/steam/steam-client.ts`: `getOwnedGames(steamId)` (`include_appinfo`, `include_played_free_games`) and `getRecentlyPlayedAppIds(steamId)`. Server-only `STEAM_API_KEY`; injectable base URL. Private/empty → `[]` (not throw); genuine transport failure throws (surfaced as "try again later").
- [ ] T013 [P] [US2] `src/lib/steam/merge-library.ts`: pure `mergeLibrary(owned, recentAppIds, existingGameNames)` → `{name, hoursPlayed, recentlyPlayed, alreadyOnProfile}[]` sorted by hours desc.
- [ ] T014 [US2] `src/lib/actions/steam-import.ts`: `readSteamLibrary()` returning `{kind:"list"|"private"|"empty"|"steam-unavailable", items?}` and `importSteamGames(selected)` — `requireAuth`, require connected `steamId`, Zod-validate, **re-derive already-present set server-side**, insert only new `userGames` (dedup by `normalizeGame`), `revalidatePath` the profile.
- [ ] T015 [US2] `src/components/profile/steam-import-dialog.tsx`: labeled, keyboard-operable checkbox list (playtime-sorted, recent pre-checked, already-added disabled), empty/private/unavailable states rendered (never a raw error), confirm → `importSteamGames`. Add the **Import library** entry point to `steam-connect-section.tsx` (shown when connected).
- [ ] T016 [US2] Wire curated images into the profile games list (FR-011): call `resolveGameImages` in `src/app/profile/page.tsx` and render each entry via the existing `GameImage` in `src/components/profile/games-list.tsx`. No new linkage, no schema change.
- [ ] T017 [US2] Integration test `src/lib/actions/steam-import.test.ts`: `importSteamGames` adds only new rows, never duplicates a hand-added or previously-imported game, stores `hoursPlayed`, and leaves existing rows untouched.
- [ ] T018 [P] [US2] E2E `e2e/steam-import.spec.ts` (Steam Web API stubbed): connect → review (recent pre-checked) → select → confirm → games on profile with playtime; private-library message path shows, nothing added.

**Checkpoint**: a player's real, chosen Steam games are on their profile.

---

## Phase 5: User Story 3 — Refresh & disconnect (Priority: P2)

**Goal**: Re-import safely (no duplicates) and disconnect (link gone, imported games kept).

**Independent Test**: Re-run import → only new games; disconnect → not connected, imported games remain.

**Depends on**: T014 (import), T002 (columns).

- [ ] T019 [US3] `src/lib/actions/steam-disconnect.ts`: `disconnectSteam()` — `requireAuth`, clear `steamId`+`steamConnectedAt`, **leave `userGames` untouched**. Add the **Disconnect** control to `steam-connect-section.tsx` (shown when connected).
- [ ] T020 [US3] Integration test: `disconnectSteam` clears the link and leaves `userGames`; a second `importSteamGames` run adds only games not already present (idempotent).
- [ ] T021 [P] [US3] E2E `e2e/steam-import.spec.ts` (extend): disconnect keeps imported games; re-import offers/creates no duplicates.

**Checkpoint**: full lifecycle works.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T022 [P] Update `CHANGELOG.md` and `status.md` (feat 038: Connect Steam & import library).
- [ ] T023 [P] Log the deferred items in `docs/future-work.md`: sign-in-with-Steam (with the emailless-account caveat), live playing-now status, Steam avatar source.
- [ ] T024 Prod: confirm the two `users` columns reconcile on deploy (`vercel-build` runs `drizzle-kit push`) and **verify by querying prod**; note that `STEAM_API_KEY` must be set in Vercel prod (via `vercel env`) before real imports work — flag to the owner (a provisioning step, like the Resend/AI keys).
- [ ] T025 Final gate: `npm run typecheck`, `npm run lint`, `npm test` (Vitest), `npm run test:e2e` (Playwright) all green; e2e run count matches `playwright test --list`. Green before merge (Principle V).

---

## Dependencies & Execution Order

- **Setup (P1)**: T001 independent.
- **Foundational (P2)**: T002 blocks all stories; T003 used by T007 (callback) and T014 (import).
- **US1 (P3)**: T005←T004(write-first); T006, T007 depend on T002+T003+T005; T008 depends on T007; T009/T010 after T007/T008.
- **US2 (P4)**: T012/T013←T011; T014 depends on T012+T013+T003; T015 depends on T014; T016 independent-ish (reuses 035); T017 after T014; T018 after T015.
- **US3 (P5)**: T019 depends on T002; T020 after T019+T014; T021 shares the import e2e file (sequential with T018).
- **Polish (P6)**: after shipped stories; T025 last.

### Parallel Opportunities

- T004/T005 (openid), T011/T012/T013 (client + merge) are file-isolated and parallelizable.
- T010 and T018/T021 touch different/same e2e specs — `steam-import.spec.ts` tasks (T018, T021) are sequential with each other; `steam-connect.spec.ts` (T010) is separate.

## Implementation Strategy

1. Setup + Foundational (T001–T003).
2. **US1** (T004–T010) → connect works, verified → demoable MVP.
3. **US2** (T011–T018) → library import → the payoff.
4. **US3** (T019–T021) → lifecycle.
5. Polish (T022–T025) → docs, prod key, green gate → merge.

### Notes

- Steam is fully simulated in tests; the injectable base URL is the seam.
- The one provisioning step a human must do: create a Steam Web API key and set `STEAM_API_KEY` in Vercel prod (T024) — real imports won't work in prod until then.
- Conventional commits `feat(038):`/`test(038):`; ADR 0012 already written; update CHANGELOG + status before merge.
