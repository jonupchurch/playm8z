# Feature Specification: Admin-editable Suggested Games

**Feature Branch**: `031-admin-suggested-games`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "I want to be able to edit the suggested games when people create their account"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An admin curates what new players are offered (Priority: P1)

A game blows up and everyone is playing it. An admin opens Settings, adds it to the suggested games,
and saves. The very next person creating an account is offered it as something they play. When a game
fades, the admin removes it so newcomers aren't offered something nobody plays any more. No developer,
no deploy, no code change.

**Why this priority**: This is the whole feature. The suggestion list is the first impression of what
this community plays, and it currently ages badly the moment tastes move — which is exactly what it
cannot do, since it is baked in at build time.

**Independent Test**: Sign in as an admin, add a game, save, then walk through account creation as a
brand-new user and confirm the game is offered. Delivers the entire user-visible value alone.

**Acceptance Scenarios**:

1. **Given** an admin is viewing the suggested games, **When** they add "Palworld" and save, **Then**
   the list redisplays including Palworld and the save is confirmed.
2. **Given** "Palworld" has been added, **When** a new user reaches the games step of account
   creation, **Then** Palworld is offered as a choice.
3. **Given** an admin removes a game and saves, **When** a new user reaches the games step, **Then**
   that game is no longer offered.
4. **Given** an admin has made changes but not saved, **When** they leave without saving, **Then** the
   stored list is unchanged.
5. **Given** a new user picks suggested games during account creation, **When** they finish, **Then**
   the games they picked are saved to their profile exactly as before this feature existed.

---

### User Story 2 - Editing suggestions never touches anybody's profile (Priority: P1)

An admin removes a game from the suggestions. Every player who already said they play that game keeps
it on their profile. The list is a set of suggestions for newcomers, not a statement about what anyone
is allowed to play.

**Why this priority**: Equal-highest with US1. The risk is live the first time anyone removes
anything, and an admin edit that quietly rewrote real players' profiles would be a serious defect.
Players are free to play anything (ADR 0001: games are free-text keywords, with no catalog); the
suggestion list must never behave like a catalog that constrains them.

**Independent Test**: Give a player a game on their profile, remove that game from the suggestions as
an admin, then load that player's profile and confirm the game is still there and unchanged.

**Acceptance Scenarios**:

1. **Given** players list "CS2" among their games, **When** an admin removes CS2 from the
   suggestions, **Then** those players still list CS2 and their profiles are otherwise untouched.
2. **Given** CS2 has been removed from the suggestions, **When** a player who lists CS2 edits an
   unrelated part of their profile and saves, **Then** the save succeeds and CS2 remains.
3. **Given** CS2 has been removed from the suggestions, **When** any player adds games to their
   profile through the normal profile flow, **Then** they are still free to add CS2 or any other game.
4. **Given** a game is removed and later re-added to the suggestions, **When** a new user reaches the
   games step, **Then** it is offered again, and nothing needed repairing in the meantime.

---

### User Story 3 - The list is trustworthy and cannot strand a newcomer (Priority: P2)

An admin cannot save a list that would break account creation — an empty list, duplicates, or blank
entries. Account creation offers no way to type a game of your own: the suggestions *are* the choice
set at that moment, so an empty list would leave a newcomer facing a step with nothing to pick.

**Why this priority**: Guardrails only matter once editing exists, and a mistake is recoverable by
editing again. But the empty case is sharper here than for a normal list, because it silently turns a
step of account creation into a dead end — so it is specified, not left to judgement.

**Independent Test**: As an admin, attempt to save an empty list, a duplicate entry, and a blank
entry; confirm each is refused with a clear reason and the stored list is unchanged.

**Acceptance Scenarios**:

1. **Given** an admin has removed every game, **When** they save, **Then** the save is refused with a
   clear reason and the stored list is unchanged.
2. **Given** an admin adds a game that already exists (ignoring case and surrounding spaces), **When**
   they save, **Then** the duplicate is refused or silently collapsed, and the list never contains the
   same game twice.
3. **Given** an admin adds a blank or whitespace-only entry, **When** they save, **Then** it is
   refused and the stored list is unchanged.
4. **Given** a non-admin (including a moderator) attempts to change the list, **When** they submit,
   **Then** the change is rejected and the stored list is unchanged.
5. **Given** any successful change, **When** an admin later reviews the audit trail, **Then** the
   change is attributable to who made it and when.

---

### Edge Cases

- **A player's profile lists a game that is no longer suggested.** It must display normally. This is
  the expected steady state after any removal, and also the normal state for any game a player added
  themselves — the suggestion list was never the set of legal games.
- **The list is emptied.** Refused (FR-009), because account creation has no free-text alternative and
  the step would become unfinishable-looking. Skipping the step must remain possible regardless.
- **A very long list.** The games step must stay usable on a phone. The list is expected to stay
  small (order of tens); no search or pagination is in scope.
- **Two admins edit at once.** The last save wins. No corruption, no partial list.
- **A game with punctuation or unusual casing** ("D&D 5e", "Magic: The Gathering", "CS2"). Existing
  entries prove these are legitimate and must be preserved exactly as typed.
- **A game is added to the suggestions that many players already list.** Nothing special happens; no
  merging, deduplication, or backfill of existing profiles is triggered.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An admin MUST be able to view the current suggested games, in the order they will be
  presented to new users.
- **FR-002**: An admin MUST be able to add a game to the suggestions.
- **FR-003**: An admin MUST be able to remove a game from the suggestions.
- **FR-004**: Changes MUST take effect for new users without a deploy or code change.
- **FR-005**: The games step of account creation MUST offer exactly the games in the stored list.
- **FR-006**: Changing the suggestions MUST NOT modify, clear, or delete any existing player's games.
- **FR-007**: Changing the suggestions MUST NOT restrict what games a player can have. Games remain
  free-text; the list only decides what is *offered* during account creation.
- **FR-008**: A new user's chosen games MUST continue to be saved to their profile exactly as they are
  today, with no change to that behaviour.
- **FR-009**: Saving an empty list MUST be refused.
- **FR-010**: The stored list MUST NOT contain duplicates — where duplication ignores case and
  surrounding whitespace — nor blank entries.
- **FR-011**: Only an admin MUST be able to change the suggestions. Moderators and all other roles
  MUST be rejected.
- **FR-012**: Every successful change MUST be recorded in the audit trail, attributable to the admin
  who made it.
- **FR-013**: Game text MUST be preserved exactly as the admin typed it (case and punctuation).
- **FR-014**: A new user MUST still be able to skip the games step, whatever the list contains.

### Key Entities

- **Suggested games list**: The ordered set of games offered to a new user during account creation. A
  single shared list. Purely a set of suggestions — it is not a catalog, and confers no notion of a
  game being "valid" or "known". Attributes: an ordered collection of non-blank, unique names.
- **Player's games**: Already exists. The games a player says they play, captured at account creation
  and editable later from their profile. Free text. Never constrained by, nor rewritten by, the
  suggestions list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can add or remove a suggested game and see it reflected in account creation
  with no deploy, no code change, and no developer involvement.
- **SC-002**: A change is visible to new users within seconds of saving, without anyone restarting
  anything.
- **SC-003**: 100% of existing players' games survive any change to the suggestions, unmodified.
- **SC-004**: Zero ways exist for a non-admin to change the list.
- **SC-005**: Account creation can always be completed — including the games step being skippable —
  regardless of the list's contents.
- **SC-006**: A player can still end up with a game that is not in the suggestions, proving the list
  never became a constraint.

## Assumptions

- **The list stays small.** A curated handful (today: fourteen), not a growing catalog. No search,
  pagination, or bulk import. This deliberately preserves ADR 0001 (games are free-text keywords, no
  curated Game catalog): this feature makes a *suggestion* list editable and must not be mistaken for
  introducing the catalog that ADR explicitly rejected.
- **Flat list only.** No cover art, per-game metadata, popularity ordering, or active/inactive flag.
  Ordering is the list's own order.
- **Renaming is not a distinct operation** — remove and add achieves it. A rename that also rewrote
  players' profiles would contradict FR-006.
- **Reordering is not required.** Stored order is presentation order.
- **Existing admin settings conventions are reused** — the same place admins already manage
  configuration, the same permission rules, the same audit-trail behaviour. No new admin screen and no
  new navigation entry.
- **Seed content**: the list starts as exactly the fourteen games in use today, so behaviour is
  unchanged until an admin edits it.
- **Where a new user's games are stored is not changed by this feature.** Account creation writes them
  where it already writes them, and the profile flow reads them where it already reads them. There is
  a known inconsistency between the account-creation store and the store the profile flow maintains
  later; it predates this feature, is invisible to the admin editing suggestions, and is explicitly
  **not** in scope to fix here — but it is recorded so the planning phase doesn't rediscover it or
  quietly "tidy" it into this feature.
- **Genre editing and age-group changes are separate features** and are not covered here.
