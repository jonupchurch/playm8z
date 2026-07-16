# Specification Quality Checklist: Posting age groups become demographic ranges

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

Validation performed 2026-07-16. Two iterations.

**One clarification was raised with the user and resolved** (FR-015): with 18+ gone, every remaining
option was a positive claim about who a party is for, so any pre-selected default would put words in
a host's mouth — yet making it required adds friction to the posting flow. The user chose to re-add
**"Any"** as the default, which is the strongest of the three options considered: it restores exactly
the meaning 18+ carried ("everyone welcome"), which is *why* today's default is harmless. FR-015 and
FR-001 now encode it, and SC-007 makes it measurable.

**This is the riskiest of the three specs, for three reasons — all now pinned by requirements:**

1. *It sounds like enforcement and must not be.* Renaming from "minimum age" to "who it's for" invites
   an implementer to add a gate. ADR 0002's own reasoning forbids it (no verified ages; a gate would
   be a child-safety claim the product cannot back). US2 and FR-010 exist solely to make the absence
   of enforcement a tested property rather than an omission.
2. *The display is already fragile.* Age is rendered today by appending "+" to the raw stored value.
   That silently produces "50++" and "30-49+" for the new values. FR-004 and FR-007 pin the display as
   a first-class requirement, and SC-002 makes it measurable, because this is the defect most likely
   to ship unnoticed — it breaks nothing, it just looks wrong.
3. *"Any" is overloaded.* It means "no preference" on a posting and "don't filter" on Browse. FR-016
   and an edge case name this explicitly. Conflating them fails in opposite directions (hide every Any
   posting, or show every posting under every filter), and both are plausible mistakes.

**Resolved without asking (documented in Assumptions):**

- *Migration* — none. "Any" makes an 18 → Any remap newly *honest*, so the Assumptions section argues
  the case against it explicitly rather than leaving the omission to look like an oversight: it is a
  production write against rows that all expire within 30 days (ADR 0003), and it only half-works
  because "21" has no honest target. Consistent with feature 030's retired-genre handling.
- *Losing 21+* — raised with the user explicitly and confirmed; recorded as an accepted loss so it is
  not later triaged as a bug.

**ADR impact — this is real work, not paperwork.** ADR 0002 is ratified and fixes `ageGroup` at
`18|21` for *both* User and Posting. This feature supersedes the Posting half only. Its other rulings
(the 18+ platform minimum, no 13-17 tier, age-as-label-not-enforcement, and the player's own `18|21`
tag) all stand. The Assumptions section calls for a new ADR recording the partial supersession,
because ADR 0002 read on its own will otherwise lead the next implementer to the wrong answer — and
the two age vocabularies now deliberately diverge, which is exactly the kind of thing a future reader
"fixes" if it isn't written down.

**Constitution check**: Principle II (validated trust boundaries) — the posting and browse boundaries
both validate age today and must keep doing so with the new vocabulary. Principle IV (scope
discipline) — the user's own age tag is explicitly untouched, and no enforcement is added.
