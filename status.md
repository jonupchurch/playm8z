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
  sign-in/sign-up UI built yet — this is machinery, not a feature.
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

The user described what playm8z actually is: gamers browse/post games,
post one-off LFG listings, post/browse persistent Groups (distinct from
LFG), a logged-in-only Forum, and a handful of admin-editable content
pages. `resources/wireframes/` currently has Home, Browse, Post a Game,
Forum, Listing (single LFG listing detail view), Inbox (messages), and
Profile — plus four admin pages under `resources/wireframes/admin/`:
Admin Forum (moderation), Admin News (content editing), Admin Postings
(moderation), Admin Users (management). Also a Dark/Light theme + style
guide in `resources/design/`. No wireframe yet for Groups; the user is
actively posting more.

Scope for the first `/speckit-specify` run is still an open question —
the user chose to wait for the rest of the wireframes (Groups, admin
pages) before deciding how to cut the first vertical slice, per the
constitution's Scope Discipline principle.

## Next up

- Resume once wireframes stop arriving: re-open the first-spec scope
  question (single slice vs. broader) before running `/speckit-specify`.
- Review and ratify (or amend) the draft constitution.
- Decide on and install a test framework.

## Blockers

- None.
