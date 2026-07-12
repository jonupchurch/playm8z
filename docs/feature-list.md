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

1. Auth & Onboarding — 🟢 spec + plan + tasks all complete (`specs/001-auth-onboarding/`, branch `001-auth-onboarding`, `playm8z - Auth & Onboarding.dc.html`) — 40 tasks across Setup/Foundational/US1(P1)/US2(P2)/US3(P3)/Polish; not yet implemented (implementation is gated on every other feature below also reaching this point)
2. Error Pages (404/500/403/maintenance) — 🟢 spec + plan + tasks all complete (`specs/002-error-pages/`, branch `002-error-pages`, `support/playm8z - Error Pages.dc.html`) — 23 tasks across Setup/Foundational/US1(P1) 404/US2(P2) 500/US3(P3) 401&403/US4(P4) maintenance/Polish; not yet implemented
3. Home — 🟢 spec + plan + tasks all complete (`specs/003-home/`, branch `003-home`, `playm8z - Home.dc.html`) — 24 tasks across Setup/Foundational/US1(P1) search+filter+sort/US2(P2) trending/US3(P3) empty-state/Polish; not yet implemented
4. Browse — 🟢 spec + plan + tasks all complete (`specs/004-browse/`, branch `004-browse`, `playm8z - Browse.dc.html`) — 22 tasks across Setup/Foundational/US1(P1) search+filter+sort/US2(P2) pills/US3(P3) empty-state/Polish; not yet implemented
5. Post a Game — 🟢 spec + plan + tasks all complete (`specs/005-post-game/`, branch `005-post-game`, `playm8z - Post a Game.dc.html`) — 20 tasks across Setup/Foundational/US1(P1) happy-path publish/US2(P2) auth+verification gate/US3(P3) validation guardrails/Polish; not yet implemented
6. Listing detail — 🟢 spec + plan + tasks all complete (`specs/006-listing-detail/`, branch `006-listing-detail`, `playm8z - Listing.dc.html`) — 27 tasks across Setup/Foundational/US1(P1) apply+withdraw/US2(P2) Q&A/US3(P3) capacity correctness/Polish; not yet implemented
7. Profile + Account settings — 🟢 spec + plan + tasks all complete (`specs/007-profile-and-account-settings/`, branch `007-profile-and-account-settings`, `playm8z - Profile.dc.html`) — 35 tasks across Setup/Foundational/US1(P1) edit profile+games+password+email/US2(P2) manage postings/US3(P3) saved listings/US4(P4) privacy+deactivate/Polish; not yet implemented
8. Blocked Users — 🟢 spec + plan + tasks all complete (`specs/008-blocked-users/`, branch `008-blocked-users`, `support/playm8z - Blocked Users.dc.html`) — 20 tasks across Setup/Foundational/US1(P1) view+search+unblock/US2(P2) block-new/Polish; not yet implemented
9. Forum index — 🟢 spec + plan + tasks all complete (`specs/009-forum-index/`, branch `009-forum-index`, `playm8z - Forum.dc.html`) — 22 tasks across Setup/Foundational/US1(P1) browse+search+filter+sort/US2(P2) create-thread/Polish; not yet implemented
10. Forum Thread — 🟢 spec + plan + tasks all complete (`specs/010-forum-thread/`, branch `010-forum-thread`, `playm8z - Forum Thread.dc.html`) — 28 tasks across Setup/Foundational/US1(P1) read+sort/US2(P2) reply+quote/US3(P3) like+report/Polish; not yet implemented
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
