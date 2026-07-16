# Specification Quality Checklist: Admin-editable Suggested Games

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-16
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

Validation performed 2026-07-16.

**Two findings from reading the code changed this spec materially** — both would have produced a
wrong spec if assumed rather than checked:

1. *A new user's games are **not** validated against the suggestion list* (the stored schema accepts
   any non-blank text). So removing a suggestion has **no** validation consequence — unlike genres
   (030), where the equivalent list is enforced at two trust boundaries. This is what makes FR-007
   ("MUST NOT restrict what games a player can have") a statement of existing fact to preserve rather
   than a new constraint to build, and it is why this feature is genuinely smaller than 030 despite
   looking like its twin.
2. *Account creation offers no free-text game entry* — the suggestion chips are the only way to pick a
   game at that moment. This is why FR-009 (refuse an empty list) is specified rather than left to
   taste: with no typed alternative, an empty list turns a step into a dead end. FR-014 pins that
   skipping must still work regardless, so an empty-ish list can never trap anyone.

**Resolved without asking (documented in Assumptions):**

- *Empty list* — refused. The alternative (allow it, rely on skip) leaves a newcomer staring at a step
  with nothing in it, which reads as broken even though it technically isn't.
- *Renaming / reordering* — same reasoning as 030: remove+add covers renaming, and a rename that
  rewrote players' profiles would contradict FR-006.
- *Duplicate comparison* — case/whitespace-insensitive, with typed casing preserved for display.

**Known adjacent defect deliberately left out of scope, and recorded so planning doesn't absorb it:**

Account creation writes a new user's games to a different store than the one the profile flow
maintains afterwards. That inconsistency is real, predates this feature, and is invisible to an admin
editing suggestions. Folding a fix into this feature would violate Principle IV (Scope Discipline) and
would make a small, safe feature into a data-migration one. The Assumptions section names it so the
plan neither rediscovers it nor silently "tidies" it in. If it should be fixed, it wants its own
feature.

**Constitution check**: Principle IV (Scope Discipline) is the live one here — the temptations are the
store inconsistency above and drifting toward a game catalog. Both are explicitly excluded. ADR 0001
(games are free-text keywords, no curated catalog) is *preserved*, not amended: an editable suggestion
list is not a catalog, and FR-007 exists to keep that line bright.
