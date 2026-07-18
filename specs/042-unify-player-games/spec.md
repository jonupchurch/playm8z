# Feature Specification: One home for a player's games (fix onboarding games never reaching the profile)

**Feature Branch**: `042-unify-player-games`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "A player's games live in two disconnected stores. Onboarding writes one; the profile and matching read the other; the two never connect, so onboarding picks vanish. Make the profile store the single source of truth, have onboarding write into it, backfill affected players safely, and deprecate the old store."

## Context *(why this feature exists)*

A player's games are kept in two separate places. When someone signs up, the onboarding step where they pick a few games saves that list to one store. But the profile page, the "you have in common" matching, and the public profile all read a *different* store — the one the profile editor maintains. The two are never reconciled.

The result is a real, user-facing bug: **a newly-onboarded player's game picks never show up on their profile and never influence matching**, even though onboarding explicitly tells them "Pick a few — we'll surface matching parties first." To get their games to appear, the player has to open their profile and add the very same games again. This makes onboarding feel broken and undercuts the core "find people who play what I play" promise on day one.

This feature makes the profile's game store the single source of truth: onboarding writes into it, existing affected players are backfilled safely, and the old onboarding-only store is retired.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A new player's onboarding games appear on their profile and in matching (Priority: P1)

A brand-new player completes onboarding and picks a few games. When they land on their profile, those exact games are there. When the site suggests parties or shows "games in common" with other players, those onboarding games count. If they later deselect a game during onboarding, it isn't added. Nothing else about the onboarding flow changes for them.

**Why this priority**: This is the bug. Fixing it is the entire point — onboarding's promise ("we'll surface matching parties first") finally holds, on the very first session. Independently valuable and testable.

**Independent Test**: Complete onboarding with two games selected, then open the profile → both games are listed; open a "in common" comparison with another player who shares one → it counts. Deselect a game before finishing → it's absent.

**Acceptance Scenarios**:

1. **Given** a new player finishing onboarding with games A and B selected, **When** they view their profile, **Then** A and B appear in their games list.
2. **Given** that same player, **When** the site computes "games in common" or party matching, **Then** A and B are included in the comparison.
3. **Given** the player selects A then deselects it before finishing, **When** onboarding completes, **Then** A is not in their games.
4. **Given** the player selects the same game twice (or two names that normalize to the same game), **When** onboarding completes, **Then** it appears once, not duplicated.
5. **Given** onboarding completes, **When** the completion summary shows a game count, **Then** the count matches the games now on the profile.

---

### User Story 2 - Existing affected players are recovered without disturbing curated lists (Priority: P2)

Players who onboarded before this fix, and whose profile game list is empty, have their original onboarding picks restored so their profile and matching reflect what they chose. Players who have already curated their profile games are left completely untouched — none of their choices are changed, removed, or re-added.

**Why this priority**: Fixing it forward (US1) helps new players; existing players who lost their onboarding games need a one-time recovery. It's separable from US1 and must be conservative — it can only ever add games for people who have none, never overwrite anyone.

**Independent Test**: For a pre-fix player with an empty profile game list but non-empty onboarding picks, run the recovery → their profile now lists those games. For a player who has curated games, run it → their list is byte-for-byte unchanged. Re-running the recovery changes nothing further.

**Acceptance Scenarios**:

1. **Given** a player with saved onboarding picks and an empty profile game list, **When** the recovery runs, **Then** their profile game list is populated from those picks (deduplicated), and matching reflects them.
2. **Given** a player who already has profile games, **When** the recovery runs, **Then** their game list is unchanged — nothing added, removed, or reordered.
3. **Given** the recovery has already run, **When** it runs again, **Then** no player's games change (idempotent).
4. **Given** a player whose onboarding picks contain duplicates (or names that normalize together), **When** they are recovered, **Then** each game appears once.

---

### User Story 3 - The old store is retired (Priority: P3)

The legacy onboarding-only game store is no longer read or written anywhere in the product. All game reads and writes go through the single source of truth. The legacy field is left in place (marked as retired) rather than removed, so no data is destroyed and a later cleanup can remove it deliberately.

**Why this priority**: Closing the loop prevents the two-store split from silently re-emerging (e.g., a future feature reading the stale field). It depends on US1 (onboarding no longer writes it) and US2 (data moved), so it lands last.

**Independent Test**: Search the product for any read or write of the legacy field → only the input-shape validation and the (now-unused, documented) field definition remain; no feature reads or writes it.

**Acceptance Scenarios**:

1. **Given** the codebase after this feature, **When** you audit game reads/writes, **Then** every one targets the single source of truth and none targets the legacy field.
2. **Given** the legacy field, **When** you inspect it, **Then** it still exists but is documented as retired, and its absence of readers/writers is verifiable.

---

### Edge Cases

- **Deduplication without a database constraint**: the games store has no uniqueness guarantee, so duplicates (including two names that normalize to the same game) must be prevented in application logic wherever games are written by this feature.
- **Deselecting during onboarding**: removing a game before finishing must remove it from the source of truth, not leave it behind.
- **Recovery must never overwrite**: a player with any curated games is skipped entirely by the recovery — it only ever seeds players who have none.
- **Recovery idempotency**: running the recovery more than once (e.g., local then production, or a re-run) never changes a player's games a second time.
- **Empty onboarding picks**: a player who selected no games during onboarding simply has an empty list — no error, nothing to recover.
- **Name-only recovery**: recovered games carry only their name (no rank or hours), since onboarding never collected those.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The player's profile game store MUST be the single source of truth for a player's games; every product surface that shows or matches on a player's games MUST read it.
- **FR-002**: Completing (or updating) the onboarding game step MUST write the selected games into the single source of truth so they appear on the profile and in matching, and MUST NOT write the legacy onboarding field.
- **FR-003**: Writing onboarding games MUST reconcile the player's games to exactly the selected set — adding newly-selected games and removing de-selected ones — deduplicated so no game (including names that normalize together) appears twice.
- **FR-004**: The onboarding game step MUST pre-fill from the player's current games in the single source of truth (so re-entering the step shows what's already chosen), not from the legacy field.
- **FR-005**: The onboarding completion summary MUST reflect the games actually saved to the single source of truth.
- **FR-006**: The system MUST provide a one-time, idempotent recovery that seeds the single source of truth from the legacy field ONLY for players who currently have no games there; players with any existing games MUST be left entirely unchanged.
- **FR-007**: The recovery MUST deduplicate the games it seeds and MUST record only game names (no rank or hours), and MUST be safe to run against every environment (local and production) and safe to re-run.
- **FR-008**: After this feature, no product surface may read or write the legacy onboarding game field; the field MUST remain in place (documented as retired), not be removed.
- **FR-009**: This feature MUST NOT add a database uniqueness/normalization constraint to the games store; deduplication MUST be handled in application logic, consistent with how games are already de-duplicated elsewhere.

### Key Entities *(include if feature involves data)*

- **Player games (source of truth)**: the maintained list of games a player plays, each with a name and optional self-reported rank/hours. Read by the profile, matching, and the public profile. This feature makes it the only store and adds onboarding as a writer of it.
- **Legacy onboarding game snapshot**: a name-only list captured once at onboarding and never updated afterward. After this feature it has no readers or writers and is retired in place (not deleted).
- **Onboarding game selection**: the set of game names a player chooses during onboarding. Its persistence target changes from the legacy snapshot to the source of truth; the selection UI and its suggestion source are unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of games selected during onboarding appear on the player's profile and are included in matching immediately after onboarding completes (today: 0%).
- **SC-002**: A player never sees a duplicate game as a result of onboarding or recovery (each game appears at most once).
- **SC-003**: The recovery changes the games of 0% of players who already have curated games, and populates 100% of players who have onboarding picks but no games yet.
- **SC-004**: The recovery is idempotent — a second run changes 0 players' games.
- **SC-005**: After this feature, 0 product surfaces read or write the legacy onboarding game field.
- **SC-006**: No new database constraint is introduced, and the change runs against existing data (including any pre-existing duplicate game rows) without failure.

## Assumptions

- **The profile store wins.** Where the two stores disagree, the profile store (the maintained one) is authoritative; the legacy field only ever seeds players who have nothing yet. This never resurrects a game a player deliberately removed and never overwrites a curated list.
- **Onboarding is a linear first-time flow.** A player builds their selection during onboarding and, once done, manages games from their profile — so reconciling the source of truth to the onboarding selection during onboarding cannot clobber a later, separately-curated list.
- **Games are free-text names** (no central catalog id), so identity/deduplication is by a normalized name, matching how games are already compared elsewhere.
- **Onboarding never collected rank or hours**, so games written or recovered by this feature are name-only.
- **The legacy field stays** for now; dropping it is a separate, later cleanup once the recovery has run everywhere and nothing reads it.

## Out of Scope

- Removing/dropping the legacy onboarding game field — deferred to a later cleanup.
- Adding a database uniqueness or normalized-name constraint to the games store — a separate decision that would need its own de-duplication of any existing rows.
- Any change to the onboarding game-picker UX or its suggested-games source — only the persistence target and the pre-fill source change.
- Merging or inferring rank/hours during recovery — onboarding has none to merge.
- Reconciling any other duplicated data store — this feature is specifically about the two game stores.
