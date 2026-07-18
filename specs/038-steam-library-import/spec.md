# Feature Specification: Connect Steam & import game library

**Feature Branch**: `038-steam-library-import`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Linking a player's Steam library to their profile" — let a signed-in player connect their Steam account (ownership proven) and choose which of their real Steam games to add to their profile, augmenting the games they entered by hand.

## Context

Today a player's games come from what they typed during onboarding and can edit by hand — self-reported and quick to go stale. Since the whole platform is about finding people to play with, a real, current library is a much stronger basis for profiles and matching. This feature lets a signed-in player **connect their Steam account** and **import the games they actually own/play**.

It is an **account enhancement, not a sign-in method.** Connecting Steam links a Steam account to a player who is *already* signed in; it never becomes a way to log in. That distinction is what keeps the feature simple: Steam accounts carry no email, and this product's account model (email verification, password reset, notification emails, the 18+ policy) depends on email — but because the player already has a full account, that problem never arises here. Signing in with Steam is explicitly out of scope and remains a separate, later decision.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect a Steam account (Priority: P1)

From account settings, a signed-in player connects their Steam account. They're sent to Steam to approve, and on return their Steam account is linked to their profile — with confidence that it's *their* account, not one they just typed a number for.

**Why this priority**: Nothing else in the feature is possible without a verified link. It's the foundation and the only genuinely new/authentication-adjacent piece.

**Independent Test**: From account settings, start Connect Steam, approve on Steam, and confirm the account shows as connected. Delivers value on its own (a verified Steam link on the profile) even before any games are imported.

**Acceptance Scenarios**:

1. **Given** a signed-in player with no Steam connected, **When** they start Connect Steam and approve on Steam, **Then** their Steam account is linked and account settings shows it as connected.
2. **Given** the return from Steam, **When** the approval can't be verified as genuine, **Then** no link is created and the player sees a clear "couldn't verify with Steam, try again" message.
3. **Given** a Steam account already linked to a *different* player, **When** someone tries to connect that same Steam account, **Then** the link is refused with a clear message and neither account is changed.
4. **Given** a player who is not signed in, **When** they attempt the connect flow, **Then** they are routed to log in first (connecting is only for an existing account).

---

### User Story 2 - Import selected games from the library (Priority: P1)

With Steam connected, the player imports their library. They're shown their games (most-played first, recently-played pre-selected) and choose which to add. The chosen games are added to their profile alongside whatever they already had — never replacing it — with playtime filled in.

**Why this priority**: This is the payoff — a real library on the profile. Co-equal with US1 for delivering the intended value.

**Independent Test**: As a player with Steam connected and a public library, run import, select a few games, confirm, and see exactly those games added to the profile with their playtime, with previously-listed games untouched.

**Acceptance Scenarios**:

1. **Given** a connected player with a public library, **When** they open import, **Then** they see their owned games ordered by playtime with recently-played ones pre-selected.
2. **Given** the import selection, **When** they confirm, **Then** exactly the selected games are added to their profile, each with its Steam playtime recorded, and their existing games remain.
3. **Given** a game the player already has on their profile (added by hand or a prior import), **When** it's among the imported set, **Then** it is not duplicated.
4. **Given** a connected player whose Steam library/game-details are private, **When** they open import, **Then** they see a clear "we couldn't see your library — make your Steam game details public, or add games manually" message, not an error, and nothing is changed.
5. **Given** a connected player who owns no games (or none visible), **When** they open import, **Then** they see an empty-state message and nothing is changed.
6. **Given** an imported game whose name matches a curated game, **When** the profile shows it, **Then** it displays that game's headline image (reusing existing image resolution — no extra work in this feature).

---

### User Story 3 - Refresh, and disconnect (Priority: P2)

Later, the player can re-run the import to pick up new games, or disconnect Steam entirely. Disconnecting unlinks Steam but leaves the games they already imported in place.

**Why this priority**: Management/lifecycle. Valuable but not required for the first useful version (a player gets full value from connect + one import).

**Independent Test**: Re-run import after connecting and confirm only genuinely new games are offered/added (no duplicates); disconnect and confirm the Steam link is gone while imported games remain on the profile.

**Acceptance Scenarios**:

1. **Given** a connected player who imported before, **When** they run import again after acquiring new games, **Then** only games not already on their profile are added; nothing is duplicated.
2. **Given** a connected player, **When** they disconnect Steam, **Then** the Steam link is removed and account settings shows Steam as not connected.
3. **Given** a player who just disconnected, **When** they view their profile, **Then** the games they previously imported are still listed (removing any is a separate, manual choice).

---

### Edge Cases

- **Forged/invalid return from Steam**: the return parameters are attacker-controlled; a link is created only after the approval is verified as genuine with Steam. An unverified or tampered return never produces a link (US1 scenario 2).
- **Same Steam account, two playm8z accounts**: one Steam account links to at most one playm8z account; a second attempt is refused (US1 scenario 3).
- **Private Steam library**: identity connect can still succeed while the library is unreadable — the feature separates "connected" from "could read the library" and messages the latter clearly, never as an error (US2 scenario 4).
- **Huge library**: a player may own thousands of games; import must not silently dump them all onto the profile — the player chooses (US2 scenario 1).
- **Re-import**: safe and idempotent by de-duplicating against what's already on the profile (US3 scenario 1).
- **Steam temporarily unavailable / times out**: the player sees a "Steam isn't responding, try again later" message; no partial or corrupt state is written.
- **Disconnect then reconnect**: allowed; reconnecting the same Steam account to the same player is fine (it wasn't linked elsewhere).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A signed-in player MUST be able to connect a Steam account from account settings, and connecting MUST prove the player controls that Steam account (an approval on Steam), not merely accept a typed identifier.
- **FR-002**: The system MUST verify the genuineness of Steam's approval on the server before linking; an unverifiable or tampered return MUST NOT create a link. Connecting MUST require an authenticated session (it links to an existing account and is never a way to sign in).
- **FR-003**: A given Steam account MUST link to at most one playm8z account. An attempt to connect a Steam account already linked elsewhere MUST be refused with a clear message and MUST change nothing.
- **FR-004**: With Steam connected, a player MUST be able to import their Steam games, choosing which to add — presented most-played first with recently-played pre-selected. The system MUST NOT add the entire library without the player's selection.
- **FR-005**: Imported games MUST be **added to** the player's existing games, never replace them, and MUST NOT create duplicates of a game already on the profile (compared case/spacing-insensitively). Manual add/remove of games MUST continue to work unchanged.
- **FR-006**: Each imported game MUST record the player's Steam playtime as its hours-played; no rank is set (Steam has no universal rank).
- **FR-007**: If a connected player's Steam library or game details are private or empty, import MUST show a clear, non-error message explaining what to do, and MUST change nothing.
- **FR-008**: A player MUST be able to disconnect Steam, which removes the link. Disconnecting MUST leave already-imported games on the profile; it MUST NOT delete them.
- **FR-009**: A player MUST be able to re-run import later; doing so MUST only add games not already on the profile (safe, idempotent).
- **FR-010**: Steam access credentials/keys used to read libraries MUST remain server-side and never be exposed to the browser. Calls to Steam MUST be triggered by explicit player action (connect, import), never on ordinary page views.
- **FR-011**: An imported game whose name matches a curated game MUST show that game's headline image through the existing image resolution; this feature MUST NOT add a separate game-to-image linkage.
- **FR-012**: Connecting or importing Steam MUST NOT alter the player's sign-in methods, email, verification state, or age eligibility; it is purely additive to an already-eligible account.

### Key Entities *(include if feature involves data)*

- **Steam link**: the association between a playm8z account and a verified Steam account (the Steam account identifier plus when it was connected). At most one per playm8z account, and each Steam account used at most once across accounts. Nullable/absent when not connected.
- **Player game (existing)**: a game on the player's profile with optional self-reported rank and hours-played. Imported games are ordinary player-game entries (name + hours from Steam); nothing distinguishes an imported entry from a hand-added one after the fact, so both are managed the same way.
- **Steam library snapshot (transient)**: the list of owned/recently-played games (name + playtime) read from Steam at import time to populate the selection screen. Not stored as such; only the games the player selects become player-game entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can go from "no Steam connected" to "selected games on my profile" in a single sitting, without leaving account settings except for the Steam approval step.
- **SC-002**: Only games the player explicitly selected are added; a player who owns thousands of games never ends up with thousands on their profile.
- **SC-003**: Re-running import never creates a duplicate game on the profile, and never removes or overwrites a game the player added by hand.
- **SC-004**: A connect attempt using a fabricated/tampered Steam return never results in a link (verified against the genuine Steam approval every time).
- **SC-005**: A player whose Steam library is private gets a clear explanation and a working manual alternative, never a broken or error screen.
- **SC-006**: Disconnecting Steam leaves the player's imported games intact and simply removes the link.

## Assumptions

- The player already has a full, 18+-eligible playm8z account; this feature only enhances it and changes nothing about eligibility, sign-in, or email.
- Steam is reached through its standard approval handshake (for identity) and its public web interface (for the owned/recently-played list); the platform holds one server-side access key for the latter, provisioned like other third-party keys and absent in tests (which simulate Steam).
- "Games on the profile" means the maintained per-player games list already shown on profiles and used by matching — imported games join that same list.
- Imported game names are stored as text, consistent with the platform's free-text game model; matching to curated games for imagery is by name and already exists.
- Import is on-demand only; there is no background/scheduled sync in this feature.
- Only Steam libraries are covered; other stores/platforms are out of scope, so import always augments rather than being the sole source of a player's games.

## Out of Scope

- **Signing in with Steam** (a login method) — the emailless-account, account-linking, and provider work is a separate future feature; this feature never makes Steam a way to log in. *(future-work)*
- **Live "playing now / online" status** on profiles — needs Steam reads on profile views plus caching and ties into the online-visibility privacy control. *(future-work)*
- **Using the Steam avatar** as a profile picture option — the avatar system can gain a Steam source later. *(future-work)*
- Achievements, friends, wishlist, playtime history, or any Steam data beyond the owned/recently-played game list.
- Automatic or scheduled re-syncing of the library.
- Non-Steam libraries (Epic, Xbox, PlayStation, mobile).
- Any change to the curated games data model (e.g. storing a Steam app id there) — image matching stays name-based.
