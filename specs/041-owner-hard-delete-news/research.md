# Research: Owner-only permanent delete for news posts

Decisions resolved before design. Grounded in code read 2026-07-17.

## 1. Owner as a standalone flag, not a role tier

**Decision**: Add `user.isOwner boolean not null default false`; the owner keeps
`role='admin'`. Gate the owner-only action on `isOwner`, not on the role rank.

**Rationale**: The role model (`ROLE_RANK` in `require-role.ts`) is an ordered
hierarchy, and several surfaces check membership with an **exact** `role ===
"admin"` string (`nav-links.tsx:66`, `admin/news/page.tsx:33`,
`pages/[slug]/page.tsx:42`). Inserting `owner` above `admin` in that hierarchy
would make each of those exact checks silently exclude the owner (Admin menu
vanishes, editor loses admin capabilities). Making owner an orthogonal flag leaves
the role — and every check against it — completely untouched, eliminating that
ripple. Cost: one additive column vs. zero, a good trade. (Chosen with the user
over a role tier and over an env-based owner email.)

**Alternative rejected**: `owner` as `ROLE_RANK.owner = 4`. Rejected: forces
widening every exact-admin check (error-prone) and pulling `ROLE_RANK` into a pure
module so client components can use it without bundling `@/db`.

## 2. The owner gate for a Server Action returns a result, not `forbidden()`

**Decision**: Add `isCurrentUserOwner(): Promise<boolean>` (server-only, reads
`user.isOwner` fresh by session email, same idiom as `lookupRole`). The page uses
it to decide whether to render the button; the delete **action** calls it and
returns `{ success:false, error }` for a non-owner rather than throwing
`forbidden()`.

**Rationale**: `requireRole()` uses `forbidden()`/`unauthorized()` because it
guards *pages* (which render an error page). This project's Server Actions instead
return discriminated `{ success }` results the client renders inline (every action
in `src/lib/actions/` does this). A non-owner hitting the action should get a
clean refusal result, not a thrown navigation. The server check is still the real
trust boundary (Principle II) — the hidden button is only UX.

## 3. Hard delete cascades cleanly; the audit entry survives it

**Decision**: `db.delete(newsPosts).where(eq(id))`. Capture the post title first
(for the audit label), then after a successful delete write
`logAuditEntry({ actorId, action:"permanently deleted a news post",
category:"content", targetType:"newsPost", targetId, targetLabel:title })`.

**Rationale**: Deletion must remove the post AND all its engagement (FR-007), but
the two engagement stores differ: `savedNewsPosts` has a real FK to `newsPosts`
(`onDelete: cascade`) so it goes automatically, whereas `likes` is POLYMORPHIC
(`targetType='newsPost'`, `targetId`, **no FK**) so it does NOT cascade and must
be purged explicitly — done in the same transaction as the post delete, or its
rows would orphan. `auditEntries.targetId` is a plain optional uuid **value**
(polymorphic target, not an FK — `log-audit-entry.ts` validates it as a uuid and
inserts it), so the audit row is unaffected by the post's deletion (FR-010). The
audit insert is append-only and independent of the delete's success path.

## 4. Additive migration + idempotent provisioning

**Decision**: Add the column to `schema.ts`, then apply it to local **and** prod
with an idempotent `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isOwner" boolean
NOT NULL DEFAULT false;` (the table is named `"user"`). Provision the owner with a
small idempotent script `scripts/set-owner.ts` that sets `isOwner=true` for
`OWNER_EMAIL` (default `jonupchurch@gmail.com`) — run against local and prod.

**Rationale**: Matches feature 038's approach — apply the exact column drizzle
would generate so the `vercel-build` `drizzle-kit push` sees no diff, sidestepping
the interactive-prompt trap of pushing from the CLI. `ADD COLUMN IF NOT EXISTS`
and a `WHERE email=` update are both safe to re-run. Verify the column landed by
querying, since `db:migrate` can silently no-op.

## 5. Confirmation UX: inline two-step, not `window.confirm`

**Decision**: The "Delete permanently" button reveals an inline confirm
(button → "Confirm permanent delete" + "Cancel") within the editor footer; the
action fires only on the second, explicit click.

**Rationale**: Keeps the destructive gate on-brand and testable with RTL (no
native dialog to stub), matching the project's designed-state discipline
(Principle III). A single click can never delete (FR-006).

## 6. Testing approach

**Decision**: Integration-test `deleteNewsPostPermanently` (real DB, mock `@/auth`,
seed a real user with `isOwner` true/false): owner → row gone + likes/saves gone +
one audit entry present; non-owner → refused, row intact, no audit entry; missing
post → graceful failure. Unit/component-test the editor: button reads "Unpublish";
"Delete permanently" shown only when `isOwner`; the two-step confirm.

**Rationale**: The delete is a real DB seam (Principle V) and the owner gate is the
load-bearing security check — both need the real-DB integration pattern already
established (`post-reply.test.ts` etc.), seeding a real `isOwner` account so the
owner-true and owner-false branches are both exercised.
