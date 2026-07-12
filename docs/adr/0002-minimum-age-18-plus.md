# 0002. Platform minimum age is 18+; drop the 13+ tier

**Status**: Accepted (2026-07-12)

## Context

`resources/guidelines.md` §5 modeled `User.ageGroup` and `Posting.ageGroup`
as a three-way `13 | 18 | 21`, and the Browse/Post-a-Game wireframes filter
on the same three tiers. But nothing in any wireframe actually *enforces*
an age boundary — age group is just a label/filter, not an access control.
For a platform that matches strangers to voice-chat and DM each other, "can
a 13-17 year old be matched with an adult" is a real child-safety and
liability question a label alone doesn't answer, and the honest fix
(verified age gating, restricted contact between minors and adults, etc.)
is a lot of surface area for a project at this stage.

## Decision

playm8z is **18+ only, at least on paper** — there is no 13-17 tier.
Signup/onboarding states an 18+ minimum (age attestation at minimum; a hard
DOB gate is an implementation detail for whoever builds Auth &
Onboarding). `ageGroup` becomes a two-way `18 | 21`: 18+ is the baseline
every user and posting satisfies by definition, and 21+ remains available
as an optional stricter tag a host can apply to their own posting (e.g. for
alcohol-adjacent tabletop meetups) — it is not a platform-wide minimum.

## Consequences

- `resources/guidelines.md` §5's `ageGroup(13|18|21)` is superseded —
  it's `18|21` wherever `ageGroup` appears (User and Posting).
- The Auth & Onboarding wireframe's age-related step and the Browse/Post a
  Game age-group segmented controls (`13+/18+/21+`) are superseded to the
  extent they offer a 13+ option — treat them as needing a small revision
  (drop the 13+ segment) rather than as still-authoritative on this point.
- Terms of Use / signup copy should state the 18+ minimum explicitly.
- This is a stated policy, not a claim that age is cryptographically
  verified — standard self-attestation (DOB field, checkbox) is the
  expected baseline; stronger verification is out of scope unless raised
  later.
