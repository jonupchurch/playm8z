# Specification Quality Checklist: Admin-editable Genres

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

**Iteration 1 findings — fixed:**

- *No implementation details*: the draft named the storage mechanism, the validation library, and
  specific file paths, all inherited from the (deliberately implementation-heavy) input. Removed from
  the spec body — they are planning concerns, and the input's technical grounding is preserved for
  `/speckit-plan` rather than lost. FR-005 now states the *outcome* ("cannot offer different genres")
  instead of the mechanism ("one shared constant").
- *Success criteria technology-agnostic*: SC-002 originally cited the 5-second config cache. Restated
  as the user-visible outcome ("visible within seconds ... without anyone restarting anything"), which
  is verifiable without knowing a cache exists.

**Resolved without asking (documented in Assumptions):**

- *Renaming* — not specified by the user. Treated as remove + add, because a true rename would have to
  either rewrite existing postings (contradicting the user's explicit "existing postings keep it"
  decision) or leave them orphaned anyway. No reasonable third reading exists, so no clarification
  marker was spent on it.
- *Reordering* — not specified. Stored order is presentation order; a drag-to-reorder interaction is a
  plausible want but not implied by "edit the list", and its absence blocks nothing.
- *Duplicate comparison* — chose case/whitespace-insensitive matching (FR-011) while preserving typed
  casing for display (FR-014). "FPS" and "fps" being separate genres has no defensible upside.

**Deliberate tensions recorded for planning, not resolved here:**

- FR-008 (reject a posting with an unlisted genre) and FR-007/FR-009 (tolerate unlisted genres on
  existing postings and browse filters) are both correct and *not* contradictory: the strictness
  applies to *new* submissions, the tolerance to *stored and incoming filter* values. The plan must
  keep these two paths distinct — collapsing them either way produces a bug. This is the feature's
  central design tension and is called out in US2 scenario 5 (re-saving an existing posting whose
  genre was retired must still succeed), which is the case most likely to be got wrong.

**Constitution check**: Principle II (validated trust boundaries) is engaged — genre is validated at
two boundaries today and both must keep validating after the list becomes dynamic. Principle IV (scope
discipline) is respected: per-genre metadata, renaming, and reordering are all explicitly excluded.
