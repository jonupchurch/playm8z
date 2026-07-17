"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";

export type UpdateAvatarResult = { success: true; url: string } | { success: false; error: string };
export type RemoveAvatarResult = { success: true } | { success: false; error: string };

// Same constraints as News covers (029) and game images -- one policy for
// all image uploads. The app-wide `bodySizeLimit: 6mb` (commit e662e2f) is
// what lets a real phone photo through a Server Action at all; without it
// the framework rejects the body at 1MB, far under this 5MB, and the
// request hangs before this validation ever runs.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Surfaces that show the current user's own avatar and should refresh. */
function revalidateOwnAvatarSurfaces() {
  revalidatePath("/profile", "layout");
  revalidatePath("/", "layout"); // SiteHeader's top-right avatar
}

/**
 * Uploads (or replaces) the signed-in user's avatar (034/FR-001).
 *
 * Own-account write, so `requireAuth()` -- not the stricter
 * `requireVerifiedEmail()`; editing your own avatar isn't the public-facing
 * kind of write that gate protects. Writes `avatarImage`, NEVER `image`
 * (that's the adapter-owned Google photo -- FR-006).
 */
export async function uploadAvatar(formData: FormData): Promise<UpdateAvatarResult> {
  const authUser = await requireAuth();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Please upload a JPEG, PNG, or WebP image." };
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: "Image must be smaller than 5MB." };
  }

  // Read the prior blob BEFORE overwriting, so we can clean it up after.
  const [before] = await db
    .select({ avatarImage: users.avatarImage })
    .from(users)
    .where(eq(users.id, authUser.id));

  const blob = await put(`avatars/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  await db.update(users).set({ avatarImage: blob.url }).where(eq(users.id, authUser.id));

  // New value is live; now free the old file. Order matters: pointing the
  // user at the new URL first means a failed delete leaves a harmless
  // orphan rather than a dangling reference (FR-012). del() frees a storage
  // FILE, not a DB record -- outside ADR 0005, which governs records.
  await deletePriorBlob(before?.avatarImage);

  revalidateOwnAvatarSurfaces();
  return { success: true, url: blob.url };
}

/**
 * Removes the signed-in user's uploaded avatar (034/FR-011). The avatar
 * then follows precedence down to the Google photo, else the gradient
 * block. Never touches `image` or `avatarColor`.
 */
export async function removeAvatar(): Promise<RemoveAvatarResult> {
  const authUser = await requireAuth();

  const [before] = await db
    .select({ avatarImage: users.avatarImage })
    .from(users)
    .where(eq(users.id, authUser.id));

  if (!before?.avatarImage) {
    // Nothing uploaded -- removing an upload that was never made is a no-op,
    // not an error (a Google-photo-only user has no upload to remove).
    return { success: true };
  }

  await db.update(users).set({ avatarImage: null }).where(eq(users.id, authUser.id));
  await deletePriorBlob(before.avatarImage);

  revalidateOwnAvatarSurfaces();
  return { success: true };
}

// del() of a URL that's already gone is a no-op, and a failed cleanup must
// never fail the user's request -- the DB is already updated by the time we
// get here, so a leaked file is the worst case, not a broken avatar.
async function deletePriorBlob(url: string | null | undefined) {
  if (!url) return;
  try {
    await del(url);
  } catch (err) {
    console.error(`[update-avatar] Could not delete prior avatar blob ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
