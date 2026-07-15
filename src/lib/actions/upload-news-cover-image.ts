"use server";

import { put } from "@vercel/blob";
import { requireRole } from "@/lib/auth/require-role";

export type UploadNewsCoverImageResult = { success: true; url: string } | { success: false; error: string };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

// FR-002/FR-003/research.md #3: plain file-type/size checks, not a
// Zod-on-File pattern -- the check is trivial and doesn't benefit from
// schema composition. FR-007: gated the same as the rest of the Admin
// News editor (moderator-or-higher), not admin-only like feature 028's
// AI assist -- this is a normal editing action, not a stricter one.
export async function uploadNewsCoverImage(formData: FormData): Promise<UploadNewsCoverImageResult> {
  await requireRole("moderator");

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

  const blob = await put(`news-covers/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return { success: true, url: blob.url };
}
