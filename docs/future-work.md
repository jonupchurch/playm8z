# Future Work

Ideas and scope explicitly deferred out of the current build, per the
constitution's Scope Discipline principle (Principle IV). Nothing here is
scheduled — it's a parking lot, not a roadmap.

## Persistent Groups

A "Groups" concept distinct from one-off LFG listings: ongoing
guilds/clans/communities that players can post and join, as opposed to an
ad-hoc LFG post that closes once seats fill. Surfaced early (2026-07-12)
from the initial product description and the wireframe nav bar (`Browse |
Groups | Forum`), but no wireframe was made and the user deferred it to
future functionality rather than including it in the first spec. Confirmed
"designed later" in `resources/guidelines.md` §1 and §10.

## Per-game hub page (maybe)

A dedicated page per game (e.g. `/games/:slug` — open postings for that
game, maybe stats/platform info), distinct from Browse's keyword
search/filter. Surfaced 2026-07-12 alongside ADR 0001
(`docs/adr/0001-game-as-free-text-keyword.md`), which rejects a curated
Game catalog in favor of a free-text keyword field. The user doesn't want
this to be a current focus — same "maybe later" status as Groups, not a
committed feature. If built later, it would aggregate on the raw keyword
rather than a canonical catalog entity.

## Not-yet-designed (per `resources/guidelines.md` §10 and `resources/sitemap.md`)

No wireframe exists yet for any of these — a design pass is needed before
they can be spec'd/built:

- Groups/Clans (browse/detail/create) — see above, the one already known.
- Logged-out marketing landing page (the "Discovery" direction from the
  brand exploration) — redirects authed users to Home.
- Public profile page (`/u/:handle`) — read-only variant of the Profile
  wireframe's Overview tab, honoring privacy flags; noted in both
  guidelines.md §7.7 and sitemap.md as a needed but undesigned variant.
- News article detail page (`/news/:slug`) — the News wireframe only
  covers the feed/list view.
- Password reset (`/reset`).
- Post-session rating/review flow.
- Discord connect flow (Discord is referenced as "coming soon" in several
  wireframes but isn't functional).
- Admin Settings (auto-flag/banned-phrase rules, roles & permissions).
- Moderator audit log.
- Ban-appeals queue.
- Mobile-specific layouts.
- Post-session rating/review flow — confirmed by the user (2026-07-12)
  as an explicit future-state feature, not just undesigned.

**Designed 2026-07-12** (`resources/wireframes/support/playm8z - Error
Pages.dc.html`): 404, 500, 403, and a maintenance/down page — no longer
on this list.

**Designed 2026-07-12** (`resources/guidelines.md` §4.6, added as a
reusable design-system pattern rather than per-page wireframes, per the
user's direction): loading skeletons, delayed-skeleton timing,
fetch-error state (distinct from the Empty state), pending-submit
button state, and submit success/error — no longer an open question.

**Designed 2026-07-12** (`resources/wireframes/support/playm8z - Blocked
Users.dc.html`): view/search blocked users, block flow (pick → confirm,
with an "also report" option), unblock confirm modal, empty states — no
longer on this list.

## Monetized / premium accounts

No pricing, premium tier, or ads anywhere in the design. Confirmed by the
user (2026-07-12): playm8z is free for now; monetized accounts are an
explicit future-state feature, not a current concern.

## Notification email scope (narrowed, not fully deferred)

Confirmed by the user (2026-07-12): only the registration/verification
email is in scope right now. Every other `Notification` type (join,
accepted, reply, mention, message, rating, news, system — per
`resources/guidelines.md` §5) stays in-app-only for now; emailing any of
them, and any notification-preferences settings UI to control that, is
future work.

## Email verification — design/implementation delegated

The user asked me to design/implement the email-verification flow "as I
see fit" (2026-07-12) rather than specifying it themselves. The DB already
has Auth.js's `verificationToken` table migrated in, so the mechanism is
half-built; this still needs: an actual transactional-email provider
(none chosen yet — a Vercel Marketplace integration is the natural fit
when this is picked up), the UX around what's gated on verification
(e.g. does an unverified user get full access with a nag, or is posting/
messaging blocked until verified?), and where in Auth & Onboarding the
verify-your-email step lives. Not designed by a wireframe; to be designed
at implementation time, likely alongside a `/speckit-plan` for the Auth
feature.
