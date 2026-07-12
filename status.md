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
  (commit `53cb372`). Everything else scaffolded in this session is
  still uncommitted, pending review.

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

## Next up

- Review and ratify (or amend) the draft constitution.
- Run `/speckit-specify` to define what playm8z actually is and its
  MVP scope — nothing product-shaped should be built before this per
  the constitution's Scope Discipline principle.
- Decide on and install a test framework.
- Commit the scaffolded app (pending review of what's currently
  untracked).

## Blockers

- None.
