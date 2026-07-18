# Contracts: owner gate + permanent delete

## `src/lib/auth/require-owner.ts` (server-only)

```ts
// Reads the current session user's `isOwner` flag fresh from the DB (by session
// email, same idiom as require-role.ts's lookupRole). Returns false when there's
// no session or the flag is off. Server-only (imports @/db) — never import into
// a client component.
export async function isCurrentUserOwner(): Promise<boolean>
```

Contract:
- No session → `false`.
- Session user with `isOwner=false` (incl. a normal admin) → `false`.
- Session user with `isOwner=true` → `true`.
- Always reads the DB (not the JWT), so provisioning takes effect on the next
  request.

## `src/lib/actions/delete-news-post.ts` (Server Action)

```ts
export type DeleteNewsPostResult = { success: true } | { success: false; error: string };

// Owner-only PERMANENT delete of a news post (scoped ADR-0005 exception).
export async function deleteNewsPostPermanently(input: { postId: string }): Promise<DeleteNewsPostResult>
```

Contract:
1. Validate `input` with Zod (`permanentDeleteSchema`: `{ postId: uuid }`).
2. Resolve the acting user; if `!isCurrentUserOwner()` → `{ success:false,
   error:"Only the site owner can permanently delete a post." }` and delete
   nothing.
3. Load the post's title (for the audit label); if the post doesn't exist →
   `{ success:false, error:"Post not found." }`.
4. `db.delete(newsPosts).where(eq(id))` (cascade removes likes/saves).
5. `logAuditEntry({ actorId, action:"permanently deleted a news post",
   category:"content", targetType:"newsPost", targetId, targetLabel:title })`.
6. `revalidatePath("/admin/news","layout")` + `revalidatePath("/news","layout")`.
7. Return `{ success:true }`.

Never overloads `save-news-post.ts` — the soft "Unpublish" (action `delete` →
`status='draft'`) is a separate, unchanged path.

## `src/lib/validations/admin-news.ts` (edit)

```ts
export const permanentDeleteSchema = z.object({ postId: z.string().uuid() });
```

## UI wiring

| File | Change |
|------|--------|
| `src/app/admin/news/page.tsx` | compute `const isOwner = await isCurrentUserOwner()`; pass `isOwner` to `<NewsPostEditor>` (leave `isAdmin={role === "admin"}` untouched). |
| `src/components/admin/news-post-editor.tsx` | accept `isOwner`; relabel the existing "Delete" button → **"Unpublish"** (still `submit("delete")`); when `isOwner && isExisting`, render an owner-only **"Delete permanently"** button with an inline two-step confirm that calls `deleteNewsPostPermanently({postId})` and, on success, navigates back to `/admin/news`. |

## Provisioning

`scripts/set-owner.ts`: idempotent; reads `OWNER_EMAIL` (default
`jonupchurch@gmail.com`), sets `isOwner=true` for that account in `DATABASE_URL`.
Run against local and prod.
