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
- Constitution drafted (`.specify/memory/constitution.md`, v0.1.0-draft,
  **unratified**) — structural process principles only; playm8z's
  actual product/MVP scope is not yet defined.
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
