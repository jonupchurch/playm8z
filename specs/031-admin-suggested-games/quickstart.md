# Quickstart / Validation Guide: Admin-editable Suggested Games

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-16

How to prove this feature works by driving it. Every scenario maps to a spec requirement.

**Setup**: a real seeded `admin` session and a real `moderator` session (`require-role.ts` reads the
real `users.role` column since feature 024). You will also need to create a **brand-new** account —
the suggestions only appear during account creation, so an existing session cannot exercise the main
path.

---

## Scenario 1 — The whole promise (SC-001, FR-005)

1. Sign in as admin → **Admin → Settings → Lists → Suggested games**.
2. Add `Palworld`. Save. Expect a success signal.
3. Sign out. Create a **new** account and walk to the games step.
4. → **Palworld is offered as a chip**, alongside the existing suggestions.
5. Pick it, finish onboarding, open the new player's profile. → Palworld is listed among their games.

Step 5 matters: FR-008 says a new user's games save exactly as they did before. If picking works but
saving doesn't, the source swap broke the wizard's own state.

## Scenario 2 — Removing a suggestion never touches a player (SC-003, FR-006) ← the dangerous one

1. Note a player who lists `CS2` (create one via account creation if needed).
2. As admin, remove `CS2` from the suggestions. Save.
3. Open that player's profile. → **CS2 is still listed**, unchanged.
4. Create a new account → the games step. → CS2 is **not** offered.
5. Query the row directly: the player's stored games still contain CS2. Nothing was rewritten.

## Scenario 3 — The list is not a catalog (FR-007, SC-006) ← the one that guards ADR 0001

1. With `CS2` removed from the suggestions, sign in as any player.
2. Profile → add `CS2` to your games through the normal profile flow.
3. → **It works.** A game absent from the suggestions is still a perfectly legal game.
4. Also add something that has never been in the list at all (`Some Obscure Indie Game`). → works.

If either is rejected, the suggestion list has become a catalog and ADR 0001 has been broken — the
single most consequential way to get this feature wrong, because it would present as "better
validation".

## Scenario 4 — The empty-list guardrail (FR-009, SC-005)

1. As admin, remove every suggested game. Save. → **refused**, with a readable reason; the stored list
   is unchanged.
2. Confirm the games step is still skippable regardless of the list's contents (FR-014): create a new
   account and skip that step. → onboarding completes.

The refusal exists because the games step has no free-text input — an empty list would leave a
newcomer facing a step with nothing to click (research.md #4).

## Scenario 5 — Guardrails (FR-010, FR-013)

As admin, attempt each; each is refused, and the stored list is unchanged:

1. Add `valorant` when `Valorant` exists. → refused or collapsed; never both.
2. Add `   ` (whitespace only). → refused.
3. Add `Magic: The Gathering` — punctuation, colon, spaces. → **accepted**, stored and displayed
   exactly as typed. (`Baldur's Gate 3` and `D&D 5e` are worth the same check: apostrophes and
   ampersands already exist in the real list and must round-trip.)

## Scenario 6 — Permissions and audit (FR-011, FR-012, SC-004)

1. Sign in as **moderator** → attempt to save the suggested games. → rejected.
2. Sign in as admin, make a change, save.
3. Admin → Audit log → the change appears, attributed to that admin.

## Scenario 7 — Timing (SC-002)

1. As admin, add a game. Save.
2. Immediately start a new account creation. Within a few seconds the game appears — no restart, no
   deploy. The delay is the settings read's 5-second TTL cache (research.md #6).

---

## Regression checks worth doing by hand

- **The other settings tabs** (General / Moderation / Safety) still save — this feature and 030 share
  the `settings` row and the Lists tab.
- **030's genres section** still works if it has already merged — the two sections share a tab and a
  save action (research.md #2).
- **Onboarding end-to-end** still completes, including skipping the games step, since the wizard's
  props changed shape.
