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

**Designed 2026-07-12** (`resources/guidelines.md` §4.6, a reusable
design-system pattern rather than per-page wireframes, per the user's
direction): loading skeletons, delayed-skeleton timing, fetch-error
state (distinct from the Empty state), pending-submit button state, and
submit success/error — no longer an open question. §4.6 was briefly
dropped by a later full regeneration pass (not sourced from any
wireframe, so the regen didn't know to keep it) and re-added by hand
the same day, with a note in `guidelines.md` itself flagging that it
won't survive a future regen automatically.

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

## Posting drafts (future state)

The "Post a Game" wireframe (`playm8z - Post a Game.dc.html`) shows a
"Save as draft" button alongside Publish, but the Posting data model
(established across Home, Browse, and Post a Game) has no draft status
— only `open | full | closed`. Adding real draft support would also
need a "My Drafts" surface (most naturally on Profile, not yet
spec'd). Excluded from Post a Game's spec (`005-post-game`) rather than
building a partial version of it; revisit if a later feature (Profile)
wants it.

## ~~Saved / bookmarked listings~~ — resolved, no longer deferred

~~The "Listing" wireframe (`playm8z - Listing.dc.html`) shows a "Save"
action alongside Share and Report in the apply panel. Not connected to
anything already decided in this project...~~ **Resolved 2026-07-12**:
the Profile wireframe (`playm8z - Profile.dc.html`) turned out to have
a full "Saved" tab all along — Profile's spec (`007-profile-and-
account-settings`) introduces the `SavedListing` entity, and Listing
detail's (`006-listing-detail`) docs were corrected to un-defer its
"Save" action accordingly (see that feature's spec/plan/data-model for
the amendment). No longer future work.

## Pronouns, languages, timezone on profile (future state)

The Profile wireframe's read-only "Public info" sidebar shows
pronouns, languages, and timezone, per `resources/guidelines.md`'s
suggested `User` fields — but no onboarding step or editor anywhere in
this project actually collects them (Auth & Onboarding never asked for
them, and Profile's own editable Account form doesn't include them
either). Omitted from Profile's spec (`007-profile-and-account-
settings`) rather than displaying fabricated values; revisit as a
combined onboarding + profile-editing addition if ever prioritized.

## In-listing report submission (future state)

The "Listing" wireframe's apply panel also shows a "Report" action.
Its real submission flow depends on the `Report` entity and moderation
pipeline described alongside the not-yet-spec'd Notifications & Report
feature (`resources/wireframes/support/playm8z - Notifications &
Report.dc.html`) — Listing detail (`006-listing-detail`) doesn't build
report submission itself; that belongs to whichever feature specs
`Report` properly.

**Update 2026-07-12**: Blocked Users (`008-blocked-users`) turned out
to need a minimal version of `Report` after all (its "Also report to
moderators" checkbox), and became that entity's first writer —
`targetType='user'` rows only, no review/queue UI. Listing detail's
own Report button is **not** retroactively un-deferred by this — that
remains a separate decision, since it'd need its own `targetType`
('posting') wiring and this hasn't been revisited yet. Whoever picks
this up next should check whether reusing Blocked Users' `Report`
table (rather than waiting for Notifications & Report) makes sense.

## Real-time (websocket) message delivery

Inbox / messaging (`011-inbox-messaging`) sends messages via an
ordinary Server Action and relies on normal navigation plus a short
client-side poll to keep an open conversation current — deliberately
not a websocket-based live-push system, to avoid taking on real-time
infrastructure as a side effect of the messaging feature itself.
Vercel Functions do support WebSockets (per the platform's current
capabilities), so this is a viable upgrade path later, not a technical
blocker — just not built now.

## Wiring other features' write actions to `createNotification()`

Notifications + Report modal (`012-notifications-and-report-modal`)
provides a `createNotification()` mechanism but doesn't itself retrofit
every already-existing write action to call it. Real triggers this
would eventually cover: a new Application (Listing detail, `006`) →
`join` notification to the host; accept/decline (Inbox, `011`) →
`accepted` notification to the applicant; a forum reply or mention
(Forum Thread, `010`) → `reply`/`mention` notification; a new direct
message (Inbox, `011`) → `message` notification. Each is a small,
self-contained addition to an already-working feature, not urgent
enough to justify amending four merged features in one pass.

## Adopting the canonical Report modal on existing simpler report flows

Blocked Users' (`008`) "Also report" checkbox and Forum Thread's
(`010`) bare "Report" button both already create a minimal `reports`
row with no `reason` (Notifications + Report modal, `012`, is the first
to actually populate that column). Upgrading either to open `012`'s
richer three-step modal instead would be more consistent, but both
already work as specced — optional polish, not a correction of
anything broken.

## Admin Users master-detail layout redesign (declined for now)

`resources/wireframes/admin/playm8z - Admin Users (Master-Detail).dc.html`
(added 2026-07-15) redraws the existing Admin Users drawer (`016`) as an
always-visible inline side panel instead of a `<dialog>` flyout, plus a
literal "Delete user" action with a confirm-delete banner. Reviewed with
the user (2026-07-15): it's a same-scope layout variant, not the bulk
multi-select management they were actually asking about (it has no
checkboxes/batch actions), and its "Delete user" button would need to be
redirected to the existing soft-ban/deactivate flow rather than built
literally, since nothing is ever hard-deleted platform-wide (ADR 0005).
Declined for now in favor of a smaller, real gap: feature `027` (view
full profile in a new tab) instead. Revisit this wireframe on its own
merits later if the drawer's current flyout treatment becomes a real
problem.

## AI writing assist for Admin Forum (no authoring surface exists yet)

Raised alongside the AI writing-assist feature for Admin News/Content
Pages (2026-07-15): Admin Forum's admin-facing UI
(`forum-review-drawer.tsx`) is moderation-only (hide/remove/escalate/
dismiss) — there's no textarea or authoring surface an admin uses to
write or edit forum content, so there's nothing for an AI assist
control to attach to today. Confirmed with the user: dropped from that
feature's scope rather than also building a net-new "edit a flagged
reply before republishing" surface as a side effect. Revisit if Admin
Forum ever grows a real admin-authored-text surface.

## A player's games are stored in two different places (future state)

Surfaced while building Admin-editable Suggested Games (031, 2026-07-16)
and deliberately **not** fixed there.

Account creation writes a new player's games to `users.gamesPlayed`
(`text[]`, via `POST /api/onboarding`). The profile flow afterwards
maintains an entirely separate `userGames` table (via
`manage-games.ts`). Two stores for what reads like one concept, with
`users.gamesPlayed` effectively onboarding-only and never updated again
once a player edits their games from their profile.

Nothing is visibly broken today, which is why it has survived: each
surface reads whichever store it writes. The risk is a future feature
that asks "what games does this player play?" and picks the wrong one —
`users.gamesPlayed` would answer with whatever they clicked during
signup and has been stale ever since.

Left alone in 031 under Principle IV: an admin editing a suggestion list
cannot see this, the feature has no need to touch either store, and
reconciling them is a data migration with its own decisions (which store
wins? what happens to a player whose two lists disagree?). It wants its
own feature, not a side effect of one.
