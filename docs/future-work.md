# Future Work

Ideas and scope explicitly deferred out of the current build, per the
constitution's Scope Discipline principle (Principle IV). Nothing here is
scheduled — it's a parking lot, not a roadmap.

## Primary-button colour contrast (WCAG AA) — accepted for now, 2026-07-16

Measured while fixing the transactional-email layout. White text on the
primary CTA colours falls short of WCAG AA's 4.5:1 for normal-size text:

- Email button, white on `#7c5cff`: **4.35:1** — a hair under. The button
  text is large-ish and bold, where the bar is only 3:1, so it plausibly
  already passes as large text; borderline either way.
- Site CTA, white on the `#ff6b1a` end of the orange gradient: **2.85:1** —
  the real gap, and it's the established brand colour on every primary
  button across the site.

Deliberately **not** changed as part of the email bugfix (that would be a
sitewide design-system change smuggled into a one-file fix). Confirmed with
the user (2026-07-16): leave both as-is for now, with this note so it's a
conscious call rather than an oversight. Body text, muted text, and links
all pass comfortably (15.7:1, 7.2:1, 6.9:1) — this is only the filled
buttons. If picked up, it's a small accessibility pass across every primary
button, email and web, with its own before/after review.

## Register reveals whether an email is already in use — accepted, 2026-07-18

`POST /api/auth/register` returns a distinct "That email is already registered." vs "That handle is already
taken." on a collision (`src/app/api/auth/register/route.ts`). The email branch is an account-enumeration
oracle: a stranger can learn whether an address has an account. This is deliberately **accepted** (confirmed
with the user, 2026-07-18):

- It's the standard signup UX — telling someone their email is already registered is what mainstream services
  do, and the privacy-preserving alternative (accept the attempt, email the existing address "someone tried to
  sign up") is heavier and more confusing.
- Handles are public identity anyway ([ADR 0006](adr/0006-handle-only-public-identity.md)), so only the *email*
  branch is sensitive.
- The real mass-enumeration risk — scripting the endpoint against many addresses — is now blunted by the
  per-IP rate limit on register ([ADR 0020](adr/0020-postgres-rate-limiting.md)).

If ever picked up, the fix is the "always answer the same, email the existing address" flow — its own small
feature, not a one-line change. `request-password-reset.ts` already models the single-response discipline.

## Rate limiting: per-account keying and tuning — deferred out of ADR 0020 (2026-07-18)

The auth rate limiter ([ADR 0020](adr/0020-postgres-rate-limiting.md)) keys on client IP, which covers
credential stuffing and enumeration without the victim-lockout DoS that per-email keying invites. Two
follow-ons are parked:

- **Per-account keying alongside IP** — block if *either* an IP or a target account exceeds, to also throttle a
  distributed brute-force against one specific account. Needs care so it can't be abused to lock a victim out.
- **Tuning / observability** — the limits (login 20/15 min, register & reset 10/hour) are conservative first
  guesses; no dashboard or alerting on throttle events yet. If abuse or false-positives show up, revisit both
  the numbers and whether an Upstash sliding window is worth the upgrade.

## Steam: sign-in, live status, and avatar — deferred out of feature 038 (2026-07-17)

Feature 038 added connecting a Steam account (settings-time link) and
importing the game library. Three adjacent Steam capabilities were
deliberately left out and parked here ([ADR 0012](adr/0012-steam-account-link-via-settings-openid.md)):

- **Sign in with Steam** (Steam as a login method). Steam is OpenID 2.0 (no
  Auth.js provider) and supplies **no email**, which clashes with this app's
  email-centric model (verification, password reset, notification email, the
  18+ policy). Making Steam a login owes an answer to the emailless-account
  question first (prompt for email as a second step, or make email optional).
  038 sidesteps all of that by being a *link on an existing account*, never a
  sign-in.
- **Live "playing now / online" status** on profiles. Needs Steam calls on
  profile *views* (with caching + rate-limit care) and ties into the existing
  `privacyShowOnline` control — a different shape from 038's user-triggered,
  never-on-render-path imports.
- **Steam avatar as a profile picture source.** The avatar system already
  supports an uploaded image and the Google photo; a Steam source could be
  added to that precedence later. Not needed to import a library.

Each is its own decision with its own ADR — none is implied by 038. The
SteamID is now linked and verifiable, which brings all three closer.

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
- ~~Password reset (`/reset`)~~ — **shipped 2026-07-16** as feature
  `033-password-reset`, at `/forgot-password` (not `/reset`; the route name
  matches the link 001 had already shipped on the login form). It was
  waiting on transactional email, which landed the same day. Note the entry
  under "Email verification" below is also now resolved.
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

## Owner-only hard delete — extensions (deferred from feature 041, 2026-07-17)

Feature 041 ([ADR 0014](adr/0014-owner-marker-and-scoped-hard-delete.md)) added an
`isOwner` account marker (orthogonal to `role`) and an owner-only permanent delete
for **news posts** — a scoped, audited exception to [ADR 0005](adr/0005-no-hard-deletes.md).
Deliberately not built there, parked here:

- **Owner hard-delete for other content types** — postings, forum threads/replies,
  users, comments. The pattern (owner check + real delete + purge polymorphic
  refs + audit) is reusable, but each type has its own cascade/orphan story (e.g.
  `likes` is polymorphic with no FK and must be purged by hand, as news taught us)
  and its own confirm UX. One type at a time, when a need arises. **The purge step
  is now a shared, documented helper** (`src/lib/db/purge-polymorphic-refs.ts`, 2026-07-18):
  it purges `likes` and deliberately preserves the audit trail, `warnings`, and
  `reports` — so a new hard-delete type calls one function instead of re-deriving
  which polymorphic tables to clean. A type that specifically wants a deleted
  target's `reports` removed from the moderation queue makes that call consciously
  and extends the helper.
- **A UI to grant/transfer the owner marker.** Today it's set directly on the
  account (`scripts/set-owner.ts`); there is intentionally no admin control for it
  (single owner). Multi-owner or ownership transfer would need that.
- **A visible "Owner" badge/title.** The marker gates the action but isn't shown
  anywhere. Displaying it as a cosmetic badge is a small, separate addition.

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

## ~~Email verification — design/implementation delegated~~ — resolved 2026-07-16

~~The user asked me to design/implement the email-verification flow "as I
see fit" (2026-07-12)... this still needs: an actual transactional-email
provider (none chosen yet — a Vercel Marketplace integration is the natural
fit when this is picked up)...~~

**Resolved.** The provider question is answered and live: Resend, via the
Vercel Marketplace, on `send.playm8z.net` (2026-07-16). The gating question
was answered by 001 itself (FR-014: unverified users read freely but can't
post, apply, or message) and is enforced by `requireVerifiedEmail()`.

Worth recording what this entry hid. Because the provider was never
provisioned, `sendVerificationEmail()` only ever `console.log`'d the link —
so in production **every Credentials sign-up was emailed nothing**, stayed
unverified, and was therefore blocked from every write action on the site.
Google sign-ups are auto-verified, which is why it went unnoticed. 001's
FR-013 ("MUST send a verification email") was simply unmet in production for
two days. See `specs/001-auth-onboarding/research.md` #1 for the full
retrospective, including why the promised "one-line swap" was three things.

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

## Wiring other features' write actions to `createNotification()` — mostly resolved 2026-07-17

Notifications + Report modal (`012-notifications-and-report-modal`)
provides a `createNotification()` mechanism but didn't itself retrofit
every already-existing write action to call it.

**Resolved by feature `040-notification-wiring`** (ADR 0013): a forum
reply → `reply` to the thread author; an `@mention` (thread or reply) →
`mention` to each mentioned player; accept/decline of an
applicant-initiated request → `accepted`/`declined` to the applicant
(the new `declined` type). All best-effort; block-suppressed;
self-excluded; deduped so one post never double-notifies. The `join`
side stays live-synthesized from `applications` for the host
(`get-notifications.ts`), so it was never a stored-notification gap.

**Still deferred:**
- **New direct message → `message` notification.** Intentionally NOT in
  the bell — the Messages nav badge (`037`) already surfaces unread DMs,
  so a bell entry would double-notify.
- **Notify all thread *participants* on a reply** (not just the thread
  author). 040 notifies the author only; fanning out to everyone who has
  posted in a thread is a broader design (who counts as a participant,
  how much fan-out per reply) with its own decisions.
- **`news`/`system` broadcast notifications** (e.g. a published news post
  notifying all/followed players) — a mass fan-out with its own
  delivery/scale design.

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

## A player's games are stored in two different places — RESOLVED 2026-07-17 (feature 042)

**Resolved** by feature `042-unify-player-games` ([ADR 0015](adr/0015-usergames-single-source-of-truth.md)):
`userGames` is now the single source of truth. Onboarding reconciles into it
(set-sync, dedup by `normalizeGame`) instead of writing `users.gamesPlayed`; a
seed-empty-only idempotent backfill (`scripts/backfill-user-games.ts`) recovered
pre-fix players without touching curated lists. It turned out to be an active bug,
not just tech debt — onboarding game picks never reached the profile or matching.

Two follow-ups deliberately deferred from 042 — **both RESOLVED 2026-07-18 by feature
`043-usergames-lockdown` ([ADR 0016](adr/0016-usergames-uniqueness-and-drop-gamesplayed.md)):**
- ~~**Drop the `users.gamesPlayed` column.**~~ **Done.** Dropped from the schema and
  database (local + prod); its defunct one-time backfill code was retired with it.
- ~~**A `userGames` uniqueness/normalized constraint.**~~ **Done.** Enforced by a Postgres
  expression unique index on `(userId, lower(btrim(game)))` (matching `normalizeGame`),
  after a one-time idempotent dedup collapsed any pre-existing duplicate rows. App-side
  dedup is kept as defense-in-depth; `addUserGame` is now conflict-safe. Note recorded in
  ADR 0016: drizzle-kit can't round-trip the expression index, so `drizzle-kit push`
  re-drops/creates it on every deploy — harmless churn, since every write path dedups
  app-side so the recreate can never hit a duplicate.

Original note (kept for context):

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

## `role === "admin"` exact checks vs `ROLE_RANK` — reviewed, non-issue (2026-07-18)

Raised during a tech-debt sweep: three sites compare `role === "admin"`
by exact string equality — `nav-links.tsx:66`, `app/pages/[slug]/page.tsx:42`,
and `app/admin/news/page.tsx:35` — while access control everywhere else goes
through the rank-based `requireRole()` / `ROLE_RANK` helper
(`src/lib/auth/require-role.ts`). Two idioms for "how privileged is this user?".

Reviewed and **accepted as-is** — this is not debt to pay down:

- None of the three is an access *gate*. Each page is already gated by
  `requireRole("moderator")`; the exact-admin check only decides whether to
  render an *extra* control that admins get and moderators don't (the Admin
  nav dropdown, the ContentPage admin affordance, the News editor's admin
  view). Getting it "wrong" shows/hides a button, never grants access.
- Exact equality is arguably *more* correct here than `>=`: the intent is
  literally "the admin tier specifically," not "at least admin." `admin` is
  already the top of `ROLE_RANK` (3), so `role === "admin"` and
  `ROLE_RANK[role] >= ROLE_RANK.admin` are equivalent today.
- The hypothetical break — a tier *above* admin (e.g. a superadmin) that
  these checks would wrongly exclude — is exactly the `isOwner` case, and we
  deliberately made owner an **orthogonal flag, not a higher role tier**
  (041, ADR 0014), precisely so it wouldn't perturb any `role === "admin"`
  check. So the one "higher than admin" concept we have is already immune.

If a genuine role tier above `admin` is ever added, revisit these three
lines then — but nothing today makes them wrong.

**Related (2026-07-18):** the role *vocabulary* is also defined in three places
(`ROLE_RANK`, `assignableRoleSchema`, `ASSIGNABLE_ROLES`) — a tech-debt sweep flagged the
drift risk. Closed by decision, not code: [ADR 0019](adr/0019-roles-closed-ranked-set-entitlements-are-markers.md)
establishes that moderation roles are a **closed, ranked set** and that entitlements/markers
(owner, a future Premium tier, …) are **orthogonal columns, never new role tiers** — so the set
won't change and the triplication can't drift. The derive-from-one-source refactor is deferred to
*if/when* a real moderation tier is ever added (YAGNI).

## Block enforcement: follow / report / forum still unguarded (deferred from 045, 2026-07-18)

Feature `045-enforce-blocks` ([ADR 0017](adr/0017-enforce-blocks-on-interaction-write-paths.md))
added the bidirectional block guard to the four party/listing interaction write paths (apply,
ask-question, invite, accept), joining DMs and notifications. Three surfaces were deliberately
left out, each its own decision:

- **Follow (public profile).** Should following someone you blocked (or who blocked you) be
  refused? Probably yes for symmetry, but a follow is a lower-stakes, one-directional interest
  signal, not contact — its own call. Not guarded yet.
- **Report submission.** A report is a safety valve you may need *because* of a block — refusing
  a blocked user from reporting the person they blocked would be actively wrong. So report should
  likely stay unguarded, but that's a conscious policy to record, not an oversight.
- **Forum write paths** (threads/replies) — a separate surface from the party/listing paths 045
  scoped; whether/how a block suppresses forum interaction (a public square, not 1:1 contact) is
  unresolved.

Whoever picks this up should decide the block-vs-follow and block-vs-report policies explicitly
and, if guarding more paths, reuse `refuseIfBlocked` / `hasActiveBlockBetween` (the invariant is
now established — the next path should call it, per ADR 0017).

## Seat reconciliation for a duplicate-accepted application (deferred from 046, 2026-07-18)

Feature `046-applications-unique-active` ([ADR 0018](adr/0018-applications-active-uniqueness-index.md))
added a partial unique index preventing duplicate ACTIVE applications, preceded by a one-time dedup.
The dedup removes the extra application row but does NOT re-derive a party's `seatsOpen`. If the
apply/invite race had ever produced two *accepted* applications for one pair before the fix (each
having decremented a seat on accept), the dedup would delete one row but leave `seatsOpen`
under-counted by one — a party showing fewer open seats than it really has. This is vanishingly
unlikely (the race window is tiny, the user base small, and the prod dedup found zero), so no
automatic seat-recompute was built. If it ever surfaces, reconcile that party's `seatsOpen` by hand
(or add a one-off recompute) — the audit trail and remaining accepted rows make the correct count
recoverable.
