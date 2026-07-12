# Feature List

Tracks progress against the constitution's Development Workflow gate:
every feature below needs a complete `spec.md`, `plan.md`, and `tasks.md`
before implementation begins on **any** of them (v0.3.0-draft). This is a
living tracking doc, not itself a spec — update it as wireframes land and
as `/speckit-specify`/`/speckit-plan`/`/speckit-tasks` are run per feature.

**Status key**: 🎨 wireframe pending · ✅ wireframed, not yet spec'd ·
📝 spec/plan/tasks in progress · 🟢 ready (spec+plan+tasks all complete)

## Exempt from the gate (infrastructure, not product surface)

- **Design System / shared UI primitives** — nav shell, admin shell,
  buttons, cards, tags, toggles, the `resources/guidelines.md` §4.6
  loading/error patterns. Built directly, like the initial app/db/auth
  scaffold, per the constitution's infrastructure-only exception.

## Wireframed, ready to spec

1. Auth & Onboarding — ✅ (`playm8z - Auth & Onboarding.dc.html`)
2. Error Pages (404/500/403/maintenance) — ✅
3. Home — ✅
4. Browse — ✅
5. Post a Game — ✅
6. Listing detail — ✅ (`playm8z - Listing.dc.html`)
7. Profile + Account settings — ✅
8. Blocked Users — ✅
9. Forum index — ✅ (`playm8z - Forum.dc.html`)
10. Forum Thread — ✅
11. Inbox / messaging — ✅
12. Notifications + Report modal — ✅ (`support/playm8z - Notifications & Report.dc.html`)
13. News feed (public) — ✅
14. Content Page (public render + inline admin edit) — ✅
15. Admin Dashboard — ✅
16. Admin Users — ✅
17. Admin Postings — ✅
18. Admin Forum — ✅
19. Admin Reports — ✅
20. Admin News — ✅
21. Admin Content Pages — ✅

## Wireframe in progress (2026-07-12)

22. Public profile page (`/u/:handle`)
23. News article detail (`/news/:slug`)
24. Admin Settings
25. Moderator audit log

## Explicitly out of scope for now

See `docs/future-work.md` for the full list and reasoning — notably
Groups/Clans, a per-game hub page, password reset, and mobile-specific
layouts aren't on this list because they're deferred or still
undesigned and not currently being worked on.
