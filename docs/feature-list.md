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
  buttons, cards, tags, toggles, and the loading/error patterns (skeleton
  loading, fetch-error state, pending-submit buttons — see `status.md`'s
  fourth gap-analysis pass; this was briefly in `guidelines.md` §4.6 but
  dropped by the latest regeneration, see note below). Built directly,
  like the initial app/db/auth scaffold, per the constitution's
  infrastructure-only exception.

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
22. Public profile page (`/u/:handle`) — ✅ (`playm8z - Public Profile.dc.html`)
    — this wireframe's extra scope beyond a read-only profile view is
    **confirmed in scope** (2026-07-12): a **Follow** toggle (a
    social-graph relationship distinct from blocking — `User` needs a
    following/follower relation whenever this is planned), a
    host-initiated **"Invite to a party"** action (distinct from the
    existing applicant-initiated "Apply for a slot"), and a "You have in
    common" mutual-connections sidebar. Also shows "Player reviews"
    (post-session ratings) as *display only*; the rating *submission*
    flow itself is still deferred (`docs/future-work.md`).
23. News article detail (`/news/:slug`) — ✅ (`playm8z - News Article.dc.html`)
24. Admin Settings — ✅ (General/maintenance mode, moderation & auto-flag
    rules, roles & access, feature flags, safety)
25. Moderator audit log — ✅ (`admin/playm8z - Admin Audit Log.dc.html`)
26. Logged-out marketing landing page — ✅ (`playm8z - Landing.dc.html`)
    — **reverses** the earlier call that this didn't need bespoke design.
    It's a real marketing page (hero, live-feeling stats, three-step
    explainer, genre browse, testimonials, final CTA) — materially more
    than the block-based Content Page system supports. See
    `docs/future-work.md` for the correction.

## Explicitly out of scope for now

See `docs/future-work.md` for the full list and reasoning — notably
Groups/Clans, a per-game hub page, password reset, and mobile-specific
layouts aren't on this list because they're deferred or still
undesigned and not currently being worked on.
