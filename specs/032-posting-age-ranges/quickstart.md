# Quickstart / Validation Guide: Posting age groups become demographic ranges

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-16

How to prove this feature works by driving it. Every scenario maps to a spec requirement.

**Setup**: an ordinary verified session (a host), and at least one posting created **before** this
change is deployed — i.e. a row whose `ageGroup` is still `18` or `21`. If none exists locally, insert
one directly; the legacy paths are the ones most likely to be broken and they cannot be produced
through the UI any more.

---

## Scenario 1 — The label renders correctly (SC-002, FR-004) ← the defect most likely to ship

1. Post a game. Set the age group to **50+**. Publish.
2. Open the posting's detail page. → it reads **`50+`**.
3. It must **not** read `50plus`, `50plus+`, or `50++`.
4. Repeat with **30-49** → reads `30-49`, not `30-49+`.
5. On Browse, apply the **30-49** filter and look at the active-filter pill. → reads `30-49`, not
   `30-49+`.

Age is rendered today by appending `+` to the raw stored value at both of these sites
(`listing/[id]/page.tsx:244`, `active-pills.tsx:62`). If the label map wasn't adopted, nothing throws
and no test fails — the page just quietly says `50plus+`. Look at it.

## Scenario 2 — The default claims nothing (FR-015, SC-007)

1. Post a game. **Do not touch the age group.** Publish.
2. → the posting is tagged **Any**.
3. → Publish was never blocked on that field.

## Scenario 3 — Exact-match filtering, and what `Any` does (FR-006, FR-016) ← easy to get backwards

1. Have three postings: one `18-29`, one `30-49`, one `Any`.
2. Browse, filter **30-49**. → only the `30-49` posting. **Not** the `Any` one, not the `18-29` one.
3. Browse, filter **Any**. → **all three** appear — `Any` means "don't filter by age", not "match
   postings tagged Any".

If the `Any`-tagged posting shows up under the 30-49 filter, tag-`any` is being treated as a wildcard.
If it never shows up anywhere, filter-`any` is being matched against the stored value. Both are
plausible mistakes and they fail in opposite directions.

## Scenario 4 — An old posting survives an unrelated edit (FR-011, US3 sc.5) ← the silent-relabel trap

1. Take a posting whose stored `ageGroup` is `21` (legacy).
2. Load it as a visitor. → it displays **`21+`**, legibly (FR-012).
3. Sign in as its host → Profile → My postings → edit it. **Change only the title.** Save.
4. → the save **succeeds**, and the posting **still shows `21+`**.
5. Query the row: `ageGroup` is still `21`. It was not rewritten.

This is the trap: a `<select value="21">` whose options don't include `21` makes the browser select
the *first* option (`Any`), so saving would silently relabel the host's posting to "Any" with nothing
erroring (research.md #5). Step 4 is the whole test.

6. In that same editor, deliberately change the age to `30-49` and save. → succeeds; `21+` is now
   gone by the host's own choice, which is the only way it should ever change.

## Scenario 5 — Strict on arrival, tolerant of what's stored (FR-008, research.md #4)

1. Submit a posting with `ageGroup=21` directly to the create path (bypassing the UI). → **rejected.**
   Legacy values can never be created anew.
2. Submit `ageGroup=nonsense`. → rejected.
3. Edit an existing `21` posting, re-submitting `21` unchanged. → **accepted** (scenario 4).

## Scenario 6 — A stale bookmark (FR-009)

1. Visit `/browse?ageGroup=21`. → the page **loads normally**; the unknown value is ignored, no error.
2. Visit `/browse?ageGroup=50%2B` (an encoded `50+`). → loads normally; ignored, no error.

The second one is why the stored token is `50plus`: in a query string a bare `+` decodes to a space
(research.md #1).

## Scenario 7 — Nothing is gated (FR-010, SC-003) ← the requirement that is an absence

1. Take a posting tagged **50+**.
2. Sign in as a player whose own profile tag is `18+`.
3. → they can view it, and **apply to join it**, with no block, no warning, and no hidden state.

Age is a label, never an access control (ADR 0002's reasoning, preserved by ADR 0009). The platform
has no verified ages; a gate would be a claim it cannot back up.

## Scenario 8 — The user's own tag is untouched (FR-013, SC-006)

1. Open your own Profile. → your age tag still reads `18+`/`21+`.
2. Open any public profile (`/u/<handle>`). → same.
3. Walk a new account through onboarding. → the age step still offers exactly **18+** and **21+**.

If any of these now offer `30-49`, the change leaked out of postings and into the user vocabulary,
which ADR 0009 explicitly keeps separate.

---

## Regression checks worth doing by hand

- **Four segments fit** on the post-a-game and Browse filter controls at a narrow/mobile width — there
  were two and three before.
- **The listing detail page's age tile** still lines up with its neighbours now that its content can be
  five characters (`30-49`) instead of three (`18+`).
- **ADR 0002 opens with the 0009 pointer**, so a reader who lands there first isn't misled.
