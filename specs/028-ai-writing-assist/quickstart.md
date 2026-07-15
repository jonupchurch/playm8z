# Quickstart: Admin-Only AI Writing Assist

## Prerequisites

- `AI_GATEWAY_API_KEY` set in `.env.local` (research.md #8 -- not yet provisioned; see Setup tasks in `tasks.md`).
- Local Postgres running with the schema pushed. No schema change for this feature, but the usual `npx drizzle-kit push` if starting fresh.
- Two seeded users: one `role: "admin"`, one `role: "moderator"` (or `"user"`) -- see `e2e/admin-settings.spec.ts`'s `beforeAll` for the exact seeding pattern (a real password hash + `role` column).

## Manual validation

1. Log in as the seeded **admin**.
2. Go to `/admin/news`, start a new post. Confirm a "Write from scratch" control is visible; enter a topic and confirm title/excerpt/body populate with a generated draft you can still edit and save normally.
3. With a body already drafted, use "Improve/rewrite" and confirm only the body field changes -- title/excerpt untouched.
4. Visit a Content Page's real URL (`/pages/<slug>`) as the same admin. Confirm the same two controls are present on the inline block editor; "Write from scratch" populates a new set of blocks, "Improve/rewrite" on a single selected block only changes that block.
5. Force a failure (e.g. temporarily unset `AI_GATEWAY_API_KEY` or disconnect network) and confirm: a clear error appears, and the pre-existing draft is completely unchanged -- no blank fields, no partial overwrite.
6. Log out, log back in as the seeded **moderator** (not admin). Confirm neither control appears on either surface, even though the moderator can still fully edit both surfaces manually as before.
7. Log out entirely; confirm the same absence for a logged-out visitor (though neither surface is reachable logged-out anyway, per each page's own existing `moderator`-minimum gate).

## Automated validation

**Vitest** (the real logic, `ai` mocked -- see research.md #7):
1. `generate-news-draft.ts` / `generate-content-page-draft.ts`: given a topic, calls `generateText` with `Output.object()` and the right schema; validates the topic input; returns the structured draft; calls `logAuditEntry()` with `category: "content"`.
2. `improve-draft-text.ts`: given existing text, calls plain `generateText`; validates the input; returns the revised string; calls `logAuditEntry()`. Confirm it's genuinely surface-agnostic (same function serves both News and Content Page callers).
3. Each Server Action's own role gate: an `admin` session succeeds; a `moderator` session is rejected -- proven against a real seeded role per this project's established pattern (024's own tests), not a mock of `require-role.ts` itself.

**Playwright** (`e2e/admin-news.spec.ts`, `e2e/content-page.spec.ts` -- gate/visibility only, never a real AI call):
1. A real seeded `admin` session sees both controls on both surfaces.
2. A real seeded `moderator` session does not see either control, on either surface, while still being able to use every other existing editing capability normally.
3. "Improve/rewrite" is absent/disabled when its target field/block has no text yet (edge case from spec.md).

## Expected outcome

All of spec.md's acceptance scenarios (US1, US2) pass; SC-001–SC-004 are satisfied.
