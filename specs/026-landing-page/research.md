# Phase 0 Research: Landing page

## 1. Reconciling the trust bar's four numbers to three real ones

**Decision**: "players" = `COUNT(user)`; "games & tables" =
`COUNT(DISTINCT postings.game)`; "parties formed this week" =
`COUNT(applications WHERE acceptedAt >= now() - interval '7 days')`
(new field, research.md #3); "avg teammate rating" is dropped
entirely.

**Rationale**: the first three are all directly, honestly computable
from existing data. The fourth has no real data behind it at all —
Public Profile's (`022`) `Review` entity was shipped with no writer,
and this project has never once substituted a fabricated number for a
genuinely absent one elsewhere (Admin Dashboard's KPIs, Admin
Reports' stats, every dropped "level"/"reliability"/"groups" instance)
— a marketing page is not the exception that should finally do that.

**Alternatives considered**: showing "avg teammate rating" as "—" or
"Coming soon" — rejected as unnecessary; simply omitting the stat
(three real numbers instead of four) reads as a normal, honest trust
bar, not a visibly-missing placeholder.

## 2. Real "open parties right now" replaces the fake "online now" count

**Decision**: the hero's live-feeling badge shows
`COUNT(postings WHERE status = 'open')`, computed at render time.

**Rationale**: identical reasoning to every prior online-presence
rejection (Home, Profile, Forum Index, Inbox, Admin Dashboard, Public
Profile) — this project has never built real presence tracking and
isn't starting now, even for a marketing flourish. "Open parties right
now" captures the same "there's activity happening" feeling using data
this project already has and already trusts (the exact same query
Home's/Browse's own open-postings lists already run).

**Alternatives considered**: dropping the badge entirely — considered,
but a real, honest number here costs nothing extra to compute (postings
already indexed by `status`) and preserves the wireframe's intended
"there's activity right now" feeling without inventing anything.

## 3. `applications.acceptedAt` — a small, bounded new field

**Decision**: `applications` (`006`, written by `011`) gains
`acceptedAt` (nullable timestamp), set by `011`'s existing
`accept-request.ts` in the same transaction that already sets
`status = 'accepted'`.

**Rationale**: no existing timestamp captures *when* an application
was accepted (only `createdAt`, which is when it was *submitted*) —
"parties formed this week" needs the former, not the latter. This
mirrors the exact same pattern already used for `reports.resolvedAt`
(Admin Reports, `019`) — a small, additive timestamp closing a real
gap between what a feature's stats need and what an earlier feature's
table already captured.

**Alternatives considered**: approximating "formed this week" from
`postings.createdAt` (postings created this week) instead — rejected,
conflates "someone posted a game" with "a party actually came
together," a materially different and less accurate claim for a trust
stat; deriving it from `messages`/`conversations.createdAt` (since
accepting also creates a conversation) — rejected, more indirect and
coincidental than just recording the acceptance moment directly.

## 4. Real floating hero card(s), with an honest fallback

**Decision**: the hero's floating card(s) show the most recent
currently-open posting(s) (reusing Home's/Browse's existing
open-postings query, no new query shape) — one primary card, and a
second smaller one if at least two exist. With zero open postings, a
static, clearly-decorative illustration (not styled as a real listing
card) replaces it.

**Rationale**: consistent with this project's page-wide refusal to
show invented content that LOOKS like real product data (a specific
host name, game, and seat count reads as a factual claim about the
platform's current state) — the same standard already applied to
every dashboard/list/card in this project. A brand-new deployment
with zero postings is the one case with nothing real to show, so a
clearly-illustrative fallback (not styled identically to a real card)
is the honest choice there.

**Alternatives considered**: a permanently-static example card (as the
wireframe's own demo does) — rejected, this project's whole "no fake
data" discipline exists specifically to avoid this; picking a RANDOM
open posting instead of the most recent — considered but rejected as
an unnecessary extra query dimension for no real benefit over "most
recent," which is simplest and matches "right now" framing.

## 5. Reworded "Real profiles & ratings" feature card

**Decision**: retitled "Real player profiles," body copy describing
only what exists today (a real profile with games played, region,
platform info — Public Profile, `022`) — no claim of reliability
scores or live ratings/reviews.

**Rationale**: `reliabilityPct` was explicitly deferred in an earlier
gap-analysis pass, and `Review` has no writer yet (rating submission
deferred) — the wireframe's original copy would overstate what a
visitor actually experiences after signing up, the marketing-copy
equivalent of a UI element that doesn't work. "Discord integration"
already correctly carries a "SOON" badge in the same grid; this card
gets the same honesty treatment via its wording instead, since it's
not a single all-or-nothing feature the way Discord is (parts of it —
profiles — are real today).

**Alternatives considered**: adding a "SOON" badge to the whole card —
rejected, inaccurate in the other direction (profiles ARE real today,
a "SOON" badge would wrongly imply nothing here works yet); leaving
the original copy unchanged — rejected, directly overstates deferred/
inert capabilities as if live.

## 6. Testimonials remain fixed marketing copy — a deliberate exception

**Decision**: three hand-written testimonial quotes ship as static
content within the landing page's own components, not backed by any
real review/feedback entity.

**Rationale**: this is the one deliberate exception to this project's
no-fake-data discipline in this feature, and it's principled, not
inconsistent: every other reconciliation in this project concerns a
UI element a visitor reasonably reads as a live, verifiable fact about
the platform's current state (a count, a badge, a specific user's
data on their own real profile). A marketing page's testimonial
section is universally understood, by convention, as curated editorial
copy — the same category as a tagline or ad headline — not a claim
that a specific person said this on a specific date via a real
feedback system. Building a whole quote-management CMS entity for
three fixed strings would also be disproportionate infrastructure for
what they actually are.

**Alternatives considered**: sourcing testimonials from `022`'s
`Review` entity once ratings exist — appealing for the future, but
`Review` has no writer yet, so there's nothing real to source from
today; a generic ContentPage-backed testimonials block — rejected as
over-engineering three fixed marketing quotes.

## 7. Genre counts reuse Browse's existing enum and Home's aggregation pattern

**Decision**: `get-landing-stats.ts` runs `GROUP BY genre` over
open postings, using Browse's (`004`) existing fixed 8-genre enum —
the same aggregation shape Home's (`003`) own "Trending now" row
already established, per game instead of per genre.

**Rationale**: identical scaling/precedent reasoning already
established twice; no new pattern needed.

**Alternatives considered**: none new.

## 8. Closing Home's explicitly-left-open root-route loop

**Decision**: `003`'s `src/app/page.tsx` is amended so an
unauthenticated visitor renders this feature's content directly
(same route, no redirect); an authenticated visitor's branch is
completely unchanged.

**Rationale**: `003`'s own research.md #3 explicitly called the
redirect-to-`/login` behavior a temporary placeholder "pending this
feature" — implementing the real behavior now is simply following
through on that already-made plan, not a new design decision.

**Alternatives considered**: a redirect from `/` to a separate
`/landing` route for unauthenticated visitors — rejected; serving the
marketing page directly at the root domain (no redirect round-trip)
is both simpler and matches how real marketing sites behave, and
`003`'s own spec already framed this as "the same route, branched by
auth state," not two routes.
