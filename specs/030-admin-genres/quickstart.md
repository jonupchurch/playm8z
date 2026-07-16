# Quickstart / Validation Guide: Admin-editable Genres

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-16

How to prove this feature actually works, by driving it — not by reading the tests. Every scenario
maps to a spec requirement.

**Setup**: a real seeded `admin` session (`users.role = 'admin'`) and a real `moderator` session.
`require-role.ts` reads the real column since feature 024, so no bypass is needed.

---

## Scenario 1 — The whole promise: one list, both screens (SC-003, FR-005)

1. Sign in as admin → **Admin → Settings → Lists**.
2. Add `Racing`. Save. Expect a success signal.
3. Open `/post` (any session). → **Racing is offered as a genre.**
4. Open `/browse`. → **Racing is offered as a filter chip.**
5. Post a game tagged Racing, then filter Browse to Racing. → the posting appears.

This is the feature. If only one of steps 3/4 shows Racing, FR-005 is broken and the two screens have
drifted — the exact failure the feature exists to prevent.

## Scenario 2 — Removal never damages a posting (FR-007, SC-004) ← the dangerous one

1. Ensure a posting exists tagged `MOBA` (post one if needed). Note its title.
2. As admin, remove `MOBA` from the Lists tab. Save.
3. Open that posting's detail page. → **it still displays "MOBA"**, unchanged.
4. Open `/post`. → MOBA is **not** offered.
5. Open `/browse`. → MOBA is **not** a filter chip.
6. Query the row directly: its `genre` is still `MOBA`. Nothing was rewritten or nulled.

## Scenario 3 — The retired-genre re-save (US2 scenario 5) ← the one most likely to be broken

1. With `MOBA` still removed from the list, sign in as the **host** of that MOBA posting.
2. Profile → My postings → edit that posting. Change **only the title**. Save.
3. → **The save succeeds**, and the posting still shows MOBA.

If this fails, the membership rule was applied to the edit path as strictly as to the create path
(research.md #4) — stranding every host whose genre was retired.

4. Now, in the same editor, try to switch the genre **to** another retired genre. → rejected. Strict
   for arriving values, tolerant of the value already stored.

## Scenario 4 — A stale bookmark (FR-009, US2 scenario 4)

1. With `MOBA` removed, visit `/browse?genres=FPS&genres=MOBA`.
2. → The page **loads normally**. FPS filtering is applied; MOBA is ignored.

Note this is a deliberate change from today's behaviour, where one unknown genre silently discards the
*whole* genre filter and shows everything (research.md #5). Confirm FPS is still honoured — that is
the point.

3. Visit `/browse?genres=NotAGenreAtAll`. → loads normally, no error, no empty-looking dead end.

## Scenario 5 — Guardrails (FR-010, FR-011)

As admin, in the Lists tab, attempt each and confirm each is refused with a readable reason, and that
the stored list is unchanged afterwards:

1. Remove every genre → save. → refused (empty).
2. Add `fps` when `FPS` exists → save. → refused or collapsed; never both in the list.
3. Add `   ` (whitespace) → save. → refused.
4. Add `Racing` twice → save. → never appears twice.

## Scenario 6 — Permissions and audit (FR-012, FR-013, SC-005)

1. Sign in as **moderator** → Admin → Settings. → the Lists tab's save is rejected (a moderator can
   reach Settings, but must not be able to change this list).
2. Sign in as admin, make any change, save.
3. Admin → Audit log → the change appears, attributed to that admin, in the content category.

## Scenario 7 — Timing (SC-002)

1. As admin, add a genre. Save.
2. Immediately reload `/browse` in another session. Within a few seconds the genre appears — no
   restart, no deploy.

The delay is the settings read's 5-second TTL cache (research.md #7). Nothing to fix; SC-002 says
"within seconds" because of it.

---

## Regression checks worth doing by hand

- **Landing page genre counts** (FR-006) still render, and reflect an added/removed genre.
- **A settings save from another tab** (General / Moderation / Safety) still works — the Lists tab
  must not have disturbed the shared settings row or the other tabs' saves.
- **`text-dim` on the accent-tinted tab background** — check contrast; this combination has failed axe
  in this project before. Default to `text-muted`.
