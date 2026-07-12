# Status

**Phase**: Initial infrastructure scaffold complete. No product spec
yet.
**Last updated**: 2026-07-12

## Where things stand

- Next.js app scaffolded (App Router, TypeScript strict, Tailwind CSS,
  `src/` layout, npm), merged into the existing repo without disturbing
  the pre-existing `resources/design/` and `resources/wireframes/`
  design comps or the original `README.md`/`LICENSE`.
- Drizzle ORM wired to a local PostgreSQL 15 instance: database
  `playm8z` created, Auth.js's adapter schema (`user`, `account`,
  `session`, `verificationToken`) migrated in, `user` extended with a
  `passwordHash` column for native login.
- Auth.js v5 wired: Google OAuth + Credentials (native email/password)
  providers, `@auth/drizzle-adapter`, JWT sessions (required alongside
  Credentials), route handler live at `/api/auth/[...nextauth]`. No
  sign-in/sign-up UI built yet — this is machinery, not a feature. (A
  wireframe now exists for this — "Auth & Onboarding" — see below.)
- Zod installed and used for the Credentials-provider input schema
  (`src/lib/validations/auth.ts`) — the pattern to extend to future
  trust boundaries per the constitution's Principle II.
- GitHub Spec Kit installed (Claude Code integration, PowerShell
  scripts) — `.specify/` and `.claude/skills/speckit-*` match the
  sibling project InterruptVector's setup.
- Constitution drafted (`.specify/memory/constitution.md`, v0.2.0-draft,
  **unratified**) — structural process principles only; playm8z's
  actual product/MVP scope is not yet defined. Amended 2026-07-12 to add
  a git branching rule (feature branches via Spec Kit's own hook, merged
  to `main` on completion, no PR review needed solo) and a
  feature-granularity default (roughly one feature per wireframed page)
  to the Development Workflow section.
- `.gitignore` copied from InterruptVector and committed by itself
  (commit `53cb372`). The full scaffold (app/db/auth/Spec Kit/draft
  constitution) is committed as `d3b9039`.

## Known gaps / accepted limitations

- No test framework yet (Vitest/Playwright, matching the sibling
  project, is the likely default — not yet decided or installed).
- Google OAuth client ID/secret are unset — need to be created in the
  Google Cloud Console and dropped into `.env.local`.
- No sign-up flow exists to actually create a Credentials-provider user
  (with a `passwordHash`) — the schema and auth config support it, but
  no route/UI does yet.
- No CI configured yet.
- Nothing deployed; local dev only, against the local Postgres
  instance.

## Product vision (informal, not yet a spec)

`resources/guidelines.md` (added 2026-07-12, Claude-Design-generated) is
now the authoritative context document tying the whole wireframe set
together: product overview, design system token reference, suggested
data models, full information architecture/route map, and a per-screen
spec (purpose/layout/interactions/data) for every wireframed page,
public and admin. It explicitly recommends the same approach already
chosen here — one `/speckit-specify` spec per feature area, mirroring
its per-screen sections — and lists what still has no design at all
(§10): Groups/Clans, a logged-out marketing landing page, post-session
rating/review, Discord connect, admin Settings, mod audit log,
ban-appeals queue, 404/error pages, mobile-specific layouts. Its
recommended tech stack section (§3) is superseded by what's already
built here (Next.js/Drizzle/Postgres/Auth.js) — read the rest, ignore
that section.

`resources/wireframes/` currently has: Home, Browse, Post a Game, Forum,
Forum Thread, Listing (single LFG listing detail view), Inbox
(messages), Profile, News (public news feed), Content Page (public
admin-authored page), and Auth & Onboarding (sign-in/sign-up + a
post-signup onboarding flow) — plus
`resources/wireframes/support/Notifications & Report.dc.html`. Seven
admin pages live under `resources/wireframes/admin/`: Admin Dashboard,
Admin Forum, Admin News, Admin Postings, Admin Users, Admin Content
Pages, Admin Reports. Also a Dark/Light theme + style guide in
`resources/design/`.

`resources/sitemap.md` (also added 2026-07-12) cross-confirms the same
IA/route map as guidelines.md §6, plus a couple of undesigned pages
guidelines.md didn't call out on its own (now folded into
`docs/future-work.md`): a public profile page (`/u/:handle`), a news
article detail page (`/news/:slug`), and password reset. It also
resolves the "Design System"/"Brand Identity" file question from
earlier: its status summary lists both as **designed** (they exist in
the design tool) but neither was copied into `resources/design/` in
this repo — only the Dark/Light Theme sheets were. Worth asking the
user whether to pull those two in as well, or treat guidelines.md §4's
distillation as sufficient.

"Groups" and the rest of the not-yet-designed list live in
`docs/future-work.md`.

**Decision (ADR 0001, `docs/adr/0001-game-as-free-text-keyword.md`):**
`game` is a free-text/keyword field, not a curated `Game` catalog entity.
No admin Games-management page — Browse's keyword search/filter over
postings is what satisfies "browse games." A per-game hub page
(`/games/:slug`) is parked as maybe-later (`docs/future-work.md`), same
non-committed status as Groups. This supersedes `guidelines.md` §5's
suggested `Game` entity and `Posting.gameId` foreign key.

`resources/wireframes/support/playm8z - Error Pages.dc.html` (added
2026-07-12) designs 404, 500, 403, and a maintenance/down page — closes
that item on the not-yet-designed list.

Loading/pending/fetch-error states (page-load skeletons, in-flight
filter/search, pending submit buttons, submit success/error) are now
specified too, per the user's direction to handle them as a reusable
design-system pattern rather than per-page wireframes —
`resources/guidelines.md` §4.6.

`resources/wireframes/support/playm8z - Blocked Users.dc.html` (added
2026-07-12) designs the blocked-users list/search, block flow (pick user
→ confirm, with an "also report" option), and unblock confirmation —
resolving that gap from the second business-requirements pass below.

**Second gap-analysis pass (2026-07-12), all resolved:**
- **ADR 0002** (`docs/adr/0002-minimum-age-18-plus.md`): playm8z is 18+
  only, at least on paper — the 13+ age tier is dropped entirely.
  `ageGroup` is `18|21`, not `13|18|21`; 21+ remains an optional stricter
  tag a host can apply, not a platform-wide minimum. Supersedes
  `guidelines.md` §5's `ageGroup(13|18|21)`. The Auth & Onboarding and
  Browse/Post-a-Game wireframes' age-related controls need a small
  revision to drop the 13+ option — not yet done.
- **ADR 0003** (`docs/adr/0003-posting-30-day-expiration.md`): a
  `Posting` auto-expires 30 days after creation unless manually closed
  or renewed (renew resets the window). No wireframe shows a "Renew"
  action yet — needs a small addition alongside the existing
  Close/Reopen actions on Profile → My postings.
- **Recurring session = descriptive only.** Confirmed: the `recurring`
  toggle on Post a Game is purely informational, not a scheduling
  engine — no auto-repost/instance-generation logic needed.
- **Post-session rating, monetized/premium accounts** — both confirmed
  explicit future-state features, not current scope. See
  `docs/future-work.md`.
- **Notification email scope narrowed**: only the registration/
  verification email is in scope now; every other notification type
  stays in-app-only. See `docs/future-work.md`.
- **Email verification** — design/implementation delegated to me by the
  user rather than specified; still needs an email-provider choice and
  a decided UX (what's gated pre-verification). See
  `docs/future-work.md`.

**Third gap-analysis pass (2026-07-12), all resolved:**
- **Steam & Discord social login are both future state.** The Auth &
  Onboarding/Profile wireframes show a working Steam login and
  "connected" state, but only Google OAuth + Credentials are actually in
  scope/built. See `docs/future-work.md`.
- **ADR 0004** (`docs/adr/0004-roster-slots-are-generic.md`): no
  structured role-matching on roster slots — the Listing wireframe's
  example role labels ("Entry / Initiator," "Flex") are flavor content,
  not a feature. A posting's description and an applicant's free-text
  message are what convey fit; the host accepts into any open generic
  seat. Supersedes `guidelines.md` §5's `RosterSlot.role` as a
  structured field.
- **Posting auto-flips to `full`** once all slots are accepted (not just
  applied-for) — confirms/extends ADR 0003's expiration model with the
  other half of the status lifecycle.
- **Blocking mid-conversation**: the existing conversation gets hidden
  and frozen (not deleted), so it stays reviewable by admins later if
  needed.
- **Admin ability to view a user's full activity** (messages, posts,
  interactions) — raised alongside the above, explicitly future state,
  not current scope. See `docs/future-work.md`.
- **Ban is permanent**, no timed-suspension tier. Appeals happen via
  Discord, not an in-app appeals queue — resolves what had been an open
  "ban-appeals queue" not-yet-designed item; it isn't undesigned, it's
  intentionally not an in-app feature.

**Resolved (2026-07-12):** the logged-out marketing landing page needs no
bespoke design — it's just another `ContentPage` using the already-designed
Content Pages system, not a distinct feature. Groups re-confirmed as
future state (no change from before).

**Fourth gap-analysis pass (2026-07-12), all resolved:**
- **Hosts can remove an accepted roster member** (e.g. a no-show/flake),
  freeing that slot back up — resolves the roster-removal question left
  open from the third pass.
- **ADR 0005** (`docs/adr/0005-no-hard-deletes.md`): nothing is ever
  hard-deleted, platform-wide — every "delete"-shaped action (user
  account, posting, forum thread/reply, content page, etc.) is a
  disable/soft-delete instead, retained for moderation/audit and to
  avoid orphaned references. Generalizes the already-decided
  blocked-mid-conversation-freeze and permanent-ban behaviors into one
  stated principle.
- **`reliabilityPct` deferred to future state** — no mechanism exists to
  compute it yet (would depend on rating, already deferred, and/or
  no-show tracking); leave it out of the MVP profile display. See
  `docs/future-work.md`.
- **No editing a posting once an applicant has been accepted.** Before
  that, the host can edit freely; once someone's accepted onto the
  roster, the listing is locked. (Whether removing the last accepted
  member re-opens editing wasn't addressed — don't assume either answer
  if it comes up.)
- **Handle/username rules**: must be unique; letters and numbers only,
  must start with a letter; max 24 characters; cannot be changed once
  registered (allowing a later change is a possible future state, not
  committed — see `docs/future-work.md`). Applies at the Zod validation
  boundary per the constitution's Principle II.

Scope for the first `/speckit-specify` run is still an open question —
the user chose to wait for wireframes to stop arriving before deciding
how to cut the first vertical slice, per the constitution's Scope
Discipline principle. `guidelines.md` §11's file→feature map is a strong
candidate starting point for how to slice specs once that happens.

## Next up

- Resume once wireframes stop arriving: re-open the first-spec scope
  question (single slice vs. broader) before running `/speckit-specify`,
  informed by `guidelines.md`.
- Review and ratify (or amend) the draft constitution.
- Decide on and install a test framework.

## Blockers

- None.
