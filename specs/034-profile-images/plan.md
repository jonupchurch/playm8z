# Implementation Plan: Profile Images

**Branch**: `034-profile-images` | **Spec**: [spec.md](./spec.md)

## Summary

Let users upload a profile photo; surface the Google photo we already store;
render both (and the existing gradient block) through **one shared `Avatar`
component** that replaces ~29 copy-pasted avatar renders. One new nullable
column, one reused upload seam, and a broad-but-mechanical migration.

The feature is mostly the migration. The novel code — an upload action and a
precedence rule — is small; the shared component adopted everywhere is the
work and the risk.

## Technical Context

**Runtime**: TypeScript, Next.js App Router (this repo's version diverges
from training data — consult `node_modules/next/dist/docs/` before
route/page work, per AGENTS.md).

**Storage**: Postgres via Drizzle (`drizzle-kit push`, **not** `db:migrate`);
Vercel Blob for files (`BLOB_READ_WRITE_TOKEN`, ADR 0008).

**Auth**: `requireAuth()` for own-account writes (not `requireVerifiedEmail`).

**Testing**: Vitest (unit, `fileParallelism:false`) + Playwright (e2e).

## Constitution Check

| Principle | Status |
|---|---|
| I — Spec-driven & legible; ADR for real tradeoffs | **Pass.** No new ADR needed — this reuses ADR 0008's Blob decision. The one judgement call (avatars trusted like bios, no moderation) is recorded in the spec (FR-014) and plan, not elevated to an ADR because it shapes no architecture. |
| II — Validate at trust boundaries | **Pass.** Upload is an authenticated own-account write; server re-validates type and size (FR-013), never trusting the client `accept` attribute. |
| III — Tests prove behaviour | **Pass.** Precedence (FR-005) and fallback (FR-007) are pure and get unit tests; the migration gets a test that the shared component honours precedence, plus e2e that an upload shows on a *second* surface (proving FR-008, not just the one it was set on). |
| IV — Scope discipline | **Pass.** No cropping, no processing, no onboarding upload, no moderation queue — all explicitly out of scope. `avatarColor` untouched. |
| V — No hard deletes (ADR 0005) | **Pass, with a note.** `del()` on a replaced blob deletes a *file*, not a record; the user row is untouched. data-model.md explains why this isn't an ADR 0005 exception. |
| VI — Legible history | **N/A** — no audit-worthy admin action; this is users editing their own avatars. |

## Approach

### Phase A — Schema

Add `users.avatarImage` (text, nullable). `drizzle-kit push`. Verify by
querying the DB directly (a green exit code has no-op'd here before), and
confirm every existing row is NULL (no backfill, no surprise avatars).

### Phase B — Upload/remove action (the trust boundary)

`src/lib/actions/update-avatar.ts`:
- `uploadAvatar(formData)` — `requireAuth()`, server-validate type/size
  (reuse 029's checks), `put()` under `avatars/`, set `avatarImage`, then
  `del()` the prior blob if any. Returns `{success,url}` / `{success,error}`.
- `removeAvatar()` — `requireAuth()`, `del()` current blob, set
  `avatarImage = NULL`.

Both `revalidatePath()` the surfaces that show the current user. Unit-tested
against the same mocked-Blob pattern 029 uses.

### Phase C — The shared `Avatar` component (the backbone)

`src/components/ui/avatar.tsx`. Props: the three sources
(`avatarImage`, `googleImage`, `avatarColor`) + `handle` + `size`. Renders
FR-005 precedence; the image path is a small client piece with `onError`
falling back to the gradient block (FR-007). Size prop maps to the real
sizes grepped from the codebase (`sm`≈h-8/9, `md`≈h-10/11, `lg`≈h-12,
`xl`≈h-23) so no call site regresses.

Fully unit-tested **before** any migration — precedence, each fallback,
onError behaviour — so the migration is swapping in a proven component, not
debugging behaviour across 29 files at once.

### Phase D — Migrate the call sites

Adopt `<Avatar>` at each of the ~29 sites. **Built by reading each file, not
find/replace** (research.md #3): the target is the gradient-background +
handle-initial + `text-on-accent` pattern; the `bg-surface text-text-dim`
icon boxes in admin drawers are NOT avatars and stay. Each migrated site must
pass the three source values through — which means each site's data query
must now also select `avatarImage` and `image`, not just `avatarColor`.
This query-shape change is the tedious, error-prone part; tasks.md lists the
sites explicitly.

`SiteHeader`'s own top-right avatar is included — miss it and the header
shows the Google photo while everything else shows the upload (research.md
#7).

### Phase E — Upload UI in account settings

Add the uploader to `account-forms.tsx` (007), cloning the News editor's
client pattern (hidden file input, `FormData`, `try/catch` around the
action, pending/error state). Show current avatar + Replace + Remove.

### Phase F — Tests & verification

Unit: action, precedence component. Component: the uploader states.
E2E: upload → appears on profile AND a listing/forum surface (FR-008);
remove → falls back. Cross-check the e2e reporter count against
`playwright test --list`.

## Risks

| Risk | Why real here | Mitigation |
|---|---|---|
| **A surface still shows the old gradient block.** | 29 sites; miss one (esp. SiteHeader) and a user's photo is inconsistent — reads as broken (SC-003). | tasks.md enumerates every site; e2e asserts the photo on a surface *other* than where it was set. |
| **Over-broad find/replace hits a non-avatar box.** | Several `h-8 w-8` boxes are icons, not avatars; a blind sweep would swap them. | Migrate by reading each file; target the initial+gradient+`text-on-accent` pattern only. |
| **A Google sign-in clobbers an uploaded avatar.** | Would happen if upload reused `users.image` (adapter-owned). | Separate `avatarImage` column; `image` never written by this feature. |
| **A data query feeds the component `avatarColor` but not the images.** | Every migrated site's query must now select two more columns; miss one and that site silently never shows photos. | tasks.md pairs each component change with its query change; the component makes the image props required so a missing one is a type error, not a silent gradient. |
| **`del()` near "no hard deletes" looks wrong / gets removed.** | A reviewer enforcing ADR 0005 might "fix" it. | data-model.md + a code comment explain file-vs-record deletion. |
| **Broken external image = broken avatar.** | Google rotates photo URLs; a revoked app 404s. | `onError` → gradient block (FR-007), unit-tested. |

## Project Structure

```
specs/034-profile-images/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── checklists/requirements.md

src/
├── db/schema.ts                        # +avatarImage
├── components/ui/avatar.tsx            # new — the shared component
├── lib/actions/update-avatar.ts        # new — upload/remove
├── components/profile/account-forms.tsx# +uploader UI
└── (~29 sites)                         # adopt <Avatar>, widen queries
```

## Complexity Tracking

No principle deviations. The only "complexity" is breadth: touching ~29
render sites. That is inherent to fixing a duplicated pattern, not
incidental — the alternative (a shared component adopted at *some* sites)
would leave the exact drift SC-003 forbids. Breadth is the point, so it's
managed by an explicit per-site task list, not avoided.
