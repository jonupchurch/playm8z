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
- Password reset (`/reset`).
- Post-session rating/review **submission** flow — confirmed by the user
  (2026-07-12) as an explicit future-state feature, not just undesigned.
  Clarified by the Public Profile wireframe (added later 2026-07-12):
  the *display* of ratings ("Player reviews," star ratings + comments) is
  already designed and lives on that page — only the flow that actually
  produces a rating after a session is what's deferred.
- Mobile-specific layouts.

**Moved to `docs/feature-list.md` (2026-07-12)**, now wireframed and
ready to spec: public profile page (`/u/:handle`), news article detail
page (`/news/:slug`), Admin Settings, and Moderator audit log.

**Designed 2026-07-12** (`resources/wireframes/support/playm8z - Error
Pages.dc.html`): 404, 500, 403, and a maintenance/down page — no longer
on this list.

**Designed 2026-07-12** (originally added as `resources/guidelines.md`
§4.6, a reusable design-system pattern rather than per-page wireframes,
per the user's direction): loading skeletons, delayed-skeleton timing,
fetch-error state (distinct from the Empty state), pending-submit
button state, and submit success/error — no longer an open question.
The §4.6 section itself was since dropped from `guidelines.md` by a
later full regeneration pass (it wasn't sourced from any wireframe, so
the regen didn't know to keep it); the decision still stands, recorded
in `status.md`'s fourth gap-analysis pass and this file — flagged to the
user whether to re-add it to `guidelines.md` directly.

**Designed 2026-07-12** (`resources/wireframes/support/playm8z - Blocked
Users.dc.html`): view/search blocked users, block flow (pick → confirm,
with an "also report" option), unblock confirm modal, empty states — no
longer on this list.

**Reversed 2026-07-12** — logged-out marketing landing page. Earlier the
same day I'd concluded this needed no bespoke design (just another
`ContentPage`); the user then designed
`resources/wireframes/playm8z - Landing.dc.html` anyway, and it's a real
marketing page (hero, live-feeling stats, three-step explainer, genre
browse, testimonials, final CTA) — well beyond what the block-based
Content Page editor (heading/paragraph/list/callout/quote/divider)
supports. It's its own feature now, tracked in `docs/feature-list.md`,
not a `ContentPage`.

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

## Steam & Discord social login (future state)

The Auth & Onboarding wireframe has a working "Steam" button, and
Profile's Connected Accounts shows Steam as "Connected · syncs your
library" (Discord is separately labeled "coming soon" everywhere it
appears). Confirmed by the user (2026-07-12): **both** are future state,
not current scope — the actual built Auth.js config only has Google OAuth
+ Credentials, and that's all that's in scope for now. Treat the
wireframes' Steam/Discord login buttons and Steam "connected" state as
aspirational, not a spec to build against yet.

## No in-app ban-appeals queue

Confirmed by the user (2026-07-12): a ban is **permanent** — there's no
timed-suspension tier. Appeals happen out-of-platform, on Discord, not
through an in-app appeals queue/flow. This resolves what was an open
"not-yet-designed" item — it isn't undesigned, it's intentionally not an
in-app feature at all.

## Admin: view a user's full activity (future state)

Raised by the user alongside the blocked-mid-conversation behavior below:
an admin ability to open a user's profile and see their messages, posts,
and interactions (a fuller investigative view than the existing per-module
moderation drawers) would help moderation, but is explicitly future
state, not needed now. Distinct from "Moderator audit log" (which logs
moderator *actions*, not a user's own content/history) — that one is no
longer deferred, see `docs/feature-list.md`.

## User `reliabilityPct` (future state)

`resources/guidelines.md` §5's `User` entity includes `reliabilityPct`,
shown on host mini-profiles (Listing detail). Confirmed by the user
(2026-07-12): this is future state, not current scope — there's no
mechanism to compute it yet anyway (it would naturally depend on
post-session ratings, already deferred, and/or no-show tracking). Leave
it out of the MVP profile display rather than building a placeholder.

## Handle change (future state, maybe)

Confirmed by the user (2026-07-12) alongside the handle format rules (see
`status.md`): handles cannot be changed once registered for now. Allowing
a later change is a possible future state, not committed.

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
