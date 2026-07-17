# Specification Quality Checklist: Game Headline Images

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-17
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

This spec was born from a live design conversation, so its job was less
"discover requirements" and more "pin decisions already made so they don't
drift." Validation focused there.

**The scope boundary is the single most important part of this spec**, and it
was the thing most at risk. Three separate scope traps are named explicitly
because each is a place the feature could quietly balloon:

1. **ADR 0001.** A "game image library" reads like the curated catalog ADR
   0001 rejected. The spec's Context and FR-021 frame it as the *lightweight
   alias layer ADR 0001 itself pre-approved* — postings untouched, no FK, new
   games free. If a reader concludes this reverses ADR 0001, the framing has
   failed; it does not, and FR-021 mandates recording exactly why.
2. **Trending count merging.** The tempting adjacent feature — "if we have
   aliases, merge 'D&D 5e' and 'dnd 5e' into one trending row" — is
   explicitly out (FR-006, Edge Cases, Out of Scope, thrice) because it
   changes ADR 0001's grouping and is a bigger call. Aliases affect *image
   lookup only*.
3. **The typeahead.** The entry-side fragmentation reducer is companion
   feature 036, carved out because it depends on this feature's game list and
   touches a different surface (Post-a-Game).

**AI safety is a requirement, not a footnote.** FR-018/019 exist because the
obvious lazy version — AI auto-maps unmatched names — is a real correctness
bug (wrong-merge on ambiguous names like "Souls"). The spec makes
human-approval and off-the-hot-path non-negotiable, and SC-007 makes "no
auto-apply" measurable.

**Deliberate deviations from the template:**
- **Context** section added — the game-keyed-not-posting-keyed insight is
  the whole reason this is admin-per-game and not per-posting-upload, and
  it's invisible without it.
- **Out of Scope** section added — for a feature this prone to creep, an
  explicit fence is cheaper than re-litigating.

**Known tension deliberately left for the plan, not resolved here:** the
"generated visual" (FR-002) must be deterministic and distinct per name. The
spec states the *property* (same name → same visual, different names →
different visuals) without prescribing how (hash-to-gradient, procedural
pattern, etc.) — correctly a plan/implementation decision. Flagged so the
plan doesn't skip proving determinism with a test.

**One honest limitation surfaced rather than hidden:** name-or-alias matching
is only as good as the aliases entered. On day one, before any aliases, only
the exact normalised spelling an admin used will match; everything else shows
the generated visual (which is still a win over flat orange). SC-001 is
written to hold *even in that state* — it asks for "distinct tiles," which
the generated visual alone satisfies — so the feature delivers before
curation, not only after.
