# Phase 0 Research: Posting age groups become demographic ranges

**Feature**: [spec.md](./spec.md) | **Date**: 2026-07-16

Every finding below was checked against the code, not recalled.

---

## 1. The stored vocabulary — and why `50+` cannot be the stored value

**Decision**: store `any` | `18-29` | `30-49` | `50plus`. Display them via a label map as
`Any` | `18-29` | `30-49` | `50+`.

**Why not store the literal `50+`**: the browse filter travels in a URL query string
(`?ageGroup=50+`), and `+` in a query string decodes to a **space**. `50+` would arrive as `"50 "`,
match nothing, and fail in a way that looks like a data bug rather than an encoding one. It would work
in tests that pass the value directly and break in a real browser — the worst failure shape.
`%2B`-encoding it everywhere would work and would be a permanent tripwire for the next person. A
URL-safe token with a display label costs one map and removes the class of bug.

The `-` in `18-29`/`30-49` is URL-safe and needs no such treatment.

`postings.ageGroup` is `text NOT NULL` (`src/db/schema.ts:172`) — no Postgres enum, no constraint. The
vocabulary change is a code change only. **No migration** (spec Assumptions).

---

## 2. Display is broken today by construction — this is the defect most likely to ship

Age is rendered by **appending `+` to the raw stored value**. Four sites:

| Site | Renders | New values would produce | Must change? |
|---|---|---|---|
| `src/app/listing/[id]/page.tsx:244` | `{posting.ageGroup}+` | `30-49+`, `50plus+` | **Yes** — posting |
| `src/components/browse/active-pills.tsx:62` | `` `${ageGroup}+` `` | `30-49+` | **Yes** — posting filter |
| `src/app/profile/page.tsx:101` | `` `${user.ageGroup}+` `` | `18+` (unchanged) | **No** — user tag |
| `src/app/u/[handle]/page.tsx:123` | `` `${profile.ageGroup}+` `` | `18+` (unchanged) | **No** — user tag |

**Decision**: a shared `postingAgeLabel(value)` map replaces the concatenation at the two
**posting** sites. The two **user-profile** sites keep concatenating, because the user's own tag
genuinely stays `18|21` (FR-013) and `18` → `18+` is still correct there.

**Why this is called out so prominently**: it breaks nothing. It throws no error, fails no type check,
and passes any test that doesn't assert the rendered string. It just quietly renders `50plus+`. FR-004
and FR-007 exist to make it a tested property, and SC-002 to make it measurable.

The label map must also carry the **legacy** values (`18` → `18+`, `21` → `21+`) so pre-existing
postings still render legibly (FR-012) for the ≤30 days before they expire (ADR 0003).

---

## 3. `Any` means two different things — do not unify them

- A **posting** tagged `any` = "no age preference" (FR-015: the default, so a host who ignores the
  field claims nothing).
- The **browse filter** `any` = "do not filter by age at all" — this already exists today
  (`browse-filters.ts:38`, `.catch("any")`) and `search-postings.ts:71` skips the WHERE clause
  entirely when it is set.

**Decision**: keep both, keep them separate (FR-016). `searchPostings` continues to skip the
condition when the filter is `any`; it never matches *on* the value `any`.

**Consequence, deliberate**: a posting tagged `any` appears only when no age filter is applied. Being
findable by an age filter is opt-in — you pick a range. The two plausible mistakes fail in opposite
directions: treating filter-`any` as "match tag `any`" hides every open party from an unfiltered
Browse; treating tag-`any` as "matches every filter" shows open parties under every range, making the
filter meaningless.

---

## 4. Create is strict, edit is tolerant — the same rule feature 030 needs for genres

FR-008 (reject an age group that isn't offered) and FR-011 (never relabel an existing posting) look
contradictory and are not: strictness applies to values *arriving*, tolerance to values *already
stored*.

- `src/lib/actions/create-posting.ts:31` — `postingSchema.safeParse`. Only the four new values are
  accepted. Legacy `18`/`21` can never be submitted anew.
- `src/lib/actions/manage-posting.ts:35` — the edit path. Must accept the posting's **currently
  stored** value even when it is a legacy one, or a host with an old posting could never edit its
  title again without being forced to relabel its age.

`manage-posting` already loads the posting (for the ownership check), so the current value is in hand.

---

## 5. The silent-relabel trap in the edit form

`src/components/profile/posting-management-card.tsx:229` is a `<select value={ageGroup}>` with
hardcoded `<option value="18">18+</option>` / `<option value="21">21+</option>`.

**The trap**: when a `<select>`'s `value` matches no `<option>`, the browser selects the **first**
option. A host opening an old `21`-tagged posting to fix a typo in the title would find the age
control showing `Any`, and saving would silently relabel their posting from "21+" to "Any" — a
rewrite of their content that they never chose, and a direct FR-011 violation. Nothing would error.

**Decision**: when the posting's stored value is not one of the four offered, the select renders an
**additional option carrying the legacy value and its legacy label** (e.g. `21+`), preselected. The
host keeps it by default; changing it is deliberate.

This is the mechanism that makes US3 scenario 5 ("saving succeeds, and never carries a range chosen on
their behalf") true rather than aspirational.

---

## 6. Every site that must change, and the two that must not

```text
CHANGE (posting vocabulary):
  src/lib/validations/posting.ts:36            ageGroup: z.enum(["18","21"]).default("18")
                                                 -> z.enum(["any","18-29","30-49","50plus"]).default("any")
  src/lib/validations/browse-filters.ts:38     ageGroup: z.enum(["any","18","21"]).catch("any")
                                                 -> z.enum(["any","18-29","30-49","50plus"]).catch("any")
  src/components/post-game/post-game-form.tsx:164,399-400   useState + two Segments -> four, default "any"
  src/components/browse/filter-sidebar.tsx:129,221-223      three Segments -> four
  src/components/profile/posting-management-card.tsx:229    select options + the legacy-option rule (#5)
  src/app/listing/[id]/page.tsx:244                         concat -> postingAgeLabel()
  src/components/browse/active-pills.tsx:62                 concat -> postingAgeLabel()
  src/lib/actions/manage-posting.ts:35                      tolerate the stored legacy value (#4)

DO NOT CHANGE (the user's own tag — FR-013):
  src/lib/validations/onboarding.ts:32-35      AGE_GROUPS = [18+, 21+]
  src/lib/validations/onboarding.ts:58,75      ageGroupSchema
  src/components/auth/onboarding-wizard.tsx:399-401
  src/app/profile/page.tsx:101                 `${user.ageGroup}+`  -- still correct
  src/app/u/[handle]/page.tsx:123              `${profile.ageGroup}+` -- still correct
  src/db/schema.ts:33                          users.ageGroup
```

The two lists are the feature. `ageGroup` appears on both `users` and `postings` and today means the
same thing on both; afterwards it does not. The `search-postings.ts:71` WHERE clause needs no change —
it is an `eq` on whatever token is passed, which is exactly FR-006's exact-match rule.

---

## 7. No enforcement is added — and that is a requirement, not an omission

ADR 0002's own reasoning: age group "is just a label/filter, not an access control", and the platform
has no verified ages. Renaming the options from a minimum age to a description of who a party is *for*
makes enforcement sound natural. It must not be added (FR-010, US2). Doing so would be a
child-safety claim the product cannot back up, on self-attested data.

`postings.ageGroup` must never appear in any join/apply/accept path. It appears in exactly two places:
display, and the Browse WHERE clause.

---

## 8. This needs an ADR, and it supersedes only half of ADR 0002

ADR 0002 (Accepted, ratified) fixes `ageGroup` at `18|21` for **both** User and Posting, and frames
21+ as "an optional stricter tag ... not a platform-wide minimum".

**Decision**: write **ADR 0009**, superseding ADR 0002's Posting ruling only. Explicitly still
standing: the 18+ platform minimum, the absence of a 13-17 tier, age-as-label-not-enforcement, and the
user's own `18|21` tag.

**Why it is real work, not paperwork**: ADR 0002 read on its own says `ageGroup` is `18|21` "wherever
`ageGroup` appears (User and Posting)". A future reader who finds `30-49` in the database and ADR 0002
in the docs will conclude the code is wrong and "fix" it. The two vocabularies now diverge on purpose,
and only a written record makes that legible. ADR 0002 also gets a pointer to 0009 — a reader who
lands on 0002 first must not act on it without seeing the amendment (the same trap that made ADR 0005
misleading until it was amended in place).
