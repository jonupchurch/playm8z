# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Scaffolded the Next.js app: App Router, TypeScript strict, Tailwind
  CSS, `src/` layout, npm.
- Zod, wired as the validation layer for trust boundaries (starting
  with the Credentials-provider auth input).
- Drizzle ORM against a local PostgreSQL database (`playm8z`, created on
  the local Postgres 15 instance): `src/db/schema.ts`, `src/db/index.ts`,
  `drizzle.config.ts`, `db:generate`/`db:migrate`/`db:studio` npm
  scripts. Initial migration applied (Auth.js's `user`/`account`/
  `session`/`verificationToken` tables, `user` extended with a
  `passwordHash` column for the native-login path).
- Auth.js v5 (`next-auth`) wired via `@auth/drizzle-adapter`: Google
  OAuth provider plus a native Credentials (email + password, hashed
  with `bcrypt-ts`) provider, JWT session strategy, route handler at
  `src/app/api/auth/[...nextauth]/route.ts`. Google client
  ID/secret are left as TODOs in `.env.local` — need to be created in
  the Google Cloud Console.
- Scaffolded the project with GitHub Spec Kit (Claude Code integration,
  PowerShell scripts, `.specify/` templates and workflow, matching the
  sibling project InterruptVector's setup).
- Drafted an initial project constitution (v0.1.0-draft, unratified) —
  process principles (spec-driven development, validated trust
  boundaries, designed/accessible UI, scope discipline, test
  discipline, legible history) structurally adapted from
  InterruptVector's constitution, with playm8z's own product scope left
  open pending `/speckit-specify`.
- Copied `.gitignore` from InterruptVector (committed standalone).
- Added three more wireframes to `resources/wireframes/`: "Post a Game"
  (listing-creation form), "Forum" (logged-in-only discussion board),
  and "Listing" (single LFG listing detail view) — alongside the
  existing Home and Browse wireframes and the Dark/Light theme + style
  guide comps.
- Added "Inbox" (messages) and "Profile" (user profile) wireframes, plus
  five admin CMS wireframes under `resources/wireframes/admin/`: Admin
  Forum (forum moderation), Admin News (news feed content editing),
  Admin Postings (posting/listing moderation), Admin Users (user
  management), and Admin Reports (user/content reports).
- Deferred "Groups" (persistent guilds/clans, distinct from one-off LFG
  listings) to `docs/future-work.md` — no wireframe was made for it, and
  it's explicitly out of scope for the first spec.
- Added six more wireframes: "Auth & Onboarding" (sign-in/sign-up plus a
  post-signup onboarding flow — what you play, where/how you play, your
  vibe), "Forum Thread" (single thread + replies), "News" (public news
  feed), "Content Page" (public rendering of an admin-editable page),
  and admin "Admin Content Pages" (CMS editor) and "Admin Dashboard".
  Also added `resources/wireframes/support/playm8z - Notifications &
  Report.dc.html` (notifications panel + content reporting flow).
- Added `resources/guidelines.md` — a Claude-Design-generated build
  guide tying the whole wireframe set together: product overview,
  design-system tokens, suggested data models, full route map, and a
  per-screen spec for every page. Expanded `docs/future-work.md` with
  its full "not-yet-designed" list (§10).
- Added `resources/sitemap.md` — a full site tree with access-level
  markers (public/authed/admin), global elements, and key page-to-page
  flows; cross-confirms guidelines.md's route map and surfaces a few
  more undesigned pages (public profile, news article detail, password
  reset), folded into `docs/future-work.md`.

### Known gaps
- No test framework installed yet (noted as an open item in the
  constitution's Test Discipline principle).
- No sign-in/sign-up UI — only the Auth.js machinery is wired up.
- Google OAuth credentials not yet created/set.
- Nothing deployed; local dev only.
