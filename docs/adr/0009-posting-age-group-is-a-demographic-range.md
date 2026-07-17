# 0009. A posting's age group is a demographic range, not a minimum age

**Status**: Accepted (2026-07-16)

**Supersedes**: [ADR 0002](./0002-minimum-age-18-plus.md), **in part** — its `Posting.ageGroup`
ruling only. Everything else in 0002 still stands; see Consequences.

## Context

ADR 0002 settled `ageGroup` as a two-way `18 | 21` for both `User` and `Posting`: 18+ is the baseline
everyone satisfies by definition, and 21+ is "an optional stricter tag a host can apply to their own
posting (e.g. for alcohol-adjacent tabletop meetups) — it is not a platform-wide minimum".

In practice that answers a question players weren't asking. Since the platform is 18+ only, tagging a
posting "18+" says nothing at all — every posting and every player satisfies it by definition. The
real question a host has is *who is this party for*: a 40-year-old looking for people around their own
age isn't trying to exclude anyone, and isn't served by a minimum-age tag that either says nothing
(18+) or says something about licensing law (21+).

The user asked for "an over 30 and over 50 option". Read as more rungs on the minimum-age ladder, that
compounds the problem — a 30+ *minimum* on an unverified, unenforced tag is meaningless. Read as a
demographic, it answers the actual question. The user confirmed the demographic reading explicitly.

## Decision

**`Posting.ageGroup` describes who a party is for.** Its values are:

| Stored | Displayed | Meaning |
|---|---|---|
| `any` | Any | No age preference. **The default.** |
| `18-29` | 18-29 | The party is for players roughly 18-29 |
| `30-49` | 30-49 | ...roughly 30-49 |
| `50plus` | 50+ | ...50 and over |

- **`18` and `21` are no longer offered.** `any` inherits the meaning `18+` carried ("everyone
  welcome"), which is why it is the default: a host who ignores the field claims nothing about who
  their party is for.
- **The 21+ signal is dropped outright**, with no replacement. This was raised explicitly and
  accepted. ADR 0002's alcohol-adjacent tabletop meetup can no longer be tagged as such.
- **It remains a label, never a gate.** No one is blocked, warned, hidden, or rejected on the basis of
  it. This is not a softening of 0002 — it is 0002's own reasoning, unchanged and load-bearing: the
  platform has no verified ages, so enforcement would be a claim it cannot back up.
- **`User.ageGroup` is untouched** and remains `18 | 21` per ADR 0002.
- **Stored as `50plus`, displayed as `50+`.** The token is deliberately not `50+`: the browse filter
  travels in a URL query string, where `+` decodes to a space, so `50+` would arrive as `"50 "` — a
  bug that appears only in a real browser and never in a test.

## Consequences

- **`User.ageGroup` and `Posting.ageGroup` now mean different things.** Same name, same table-adjacent
  concept, divergent vocabularies: the user's own tag is a self-described `18+`/`21+`, the posting's
  is a demographic range. This is deliberate and follows from the decision to change postings only.
  Anyone who "fixes" one to match the other reintroduces the problem this ADR exists to solve.
- **What still stands from ADR 0002** — none of this is superseded:
  - playm8z is 18+ only; there is no 13-17 tier.
  - Age is a label and a filter, never an access control.
  - Age is self-attested, not verified.
  - `User.ageGroup` is `18 | 21`.
- **No migration.** Postings created before this carry `18` or `21`. They are left exactly as stored,
  still display their old labels, and expire on their own within 30 days (ADR 0003), so the mixed
  state is self-limiting. An automated remap was considered and rejected: `18` → `any` would be
  honest, but `21` has no honest target — its meaning is being dropped — so a migration would either
  leave a legacy value behind anyway or overwrite a constraint a host deliberately chose.
- **Browse's `any` and a posting's `any` are different things.** The filter's `any` means "don't
  filter by age"; the tag's `any` means "no preference". A posting tagged `any` is therefore not
  surfaced by an age filter — being findable by age is opt-in, by picking a range.
- **Guidelines/wireframes are superseded** wherever they show a posting's age as `13+/18+/21+`, on top
  of the revision ADR 0002 already called for.
- **The 21+ capability is gone.** If a real need for it returns (a host wanting to signal an
  alcohol-adjacent meetup), it should come back as its own orthogonal tag rather than as a value in
  this list — mixing a maturity signal back into a demographic vocabulary is what made the original
  model incoherent.
