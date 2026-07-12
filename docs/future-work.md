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
- 404/500 error pages.
- Mobile-specific layouts.
