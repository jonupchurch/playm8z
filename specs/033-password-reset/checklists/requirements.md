# Specification Quality Checklist: Password Reset

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

Validation ran twice; the first pass failed two items and the spec was
amended rather than the checklist ticked.

**Failed on first pass, now fixed:**

1. *"No implementation details"* — FR-012 originally read "reset tokens
   MUST be stored hashed", which names the mechanism. Rewritten to state
   the property instead ("MUST NOT be readable from the stored data by
   anyone who obtains a copy of it"), leaving hashing to the plan. Same
   treatment for FR-011, which had named the `verificationToken` table.
2. *"Requirements are testable"* — FR-020 originally said the system
   "SHOULD discourage abuse", which is not testable and not a decision.
   It now states a MUST, names the constraint that no rate-limiting
   mechanism exists in the project today, and explicitly forbids
   satisfying it in a way that breaks FR-004. What the limit *is* remains
   a planning decision; that it exists is not.

**Deliberate deviations from the template, both judged worth it:**

- A **Context** section was added ahead of User Scenarios. This feature is
  unusual in being pre-decided by another feature's FR-015 and blocked for
  months on a dependency that cleared *yesterday*; a reader who doesn't
  know that will not understand why a 404 shipped on purpose.
- An **Out of Scope** section was added. The template folds this into
  Assumptions, but the boundary here (reset vs. change-while-logged-in vs.
  MFA) is the most likely place for scope to creep.

**Known tension, recorded rather than resolved here:**

FR-004 (identical responses) and FR-020 (throttling) pull against each
other — the natural implementation of a limit is to tell the user they've
hit it, which is exactly the tell FR-004 forbids. The spec states both and
requires the conflict be resolved in favour of FR-004. The plan must show
how, and it must be tested, or the leak returns quietly.

FR-020 reads like it demands new infrastructure. It likely doesn't: the
token store already has to know when the last link for an account was
issued in order to satisfy FR-009, which is the same fact a throttle
needs. Flagged for the plan to confirm — if that holds, the requirement
costs almost nothing and the scope worry is unfounded.
