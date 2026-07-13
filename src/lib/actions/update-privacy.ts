"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { privacyKeySchema, type PrivacyKey } from "@/lib/validations/profile";

export type UpdatePrivacyResult = { success: true } | { success: false; error: string };

// FR-012: each of the four privacy toggles persists independently.
// Stored here but not yet consumed anywhere -- the not-yet-spec'd
// Public Profile feature is what will honor them (spec.md Assumptions).
export async function updatePrivacy(key: PrivacyKey, value: boolean): Promise<UpdatePrivacyResult> {
  const user = await requireAuth();

  const parsedKey = privacyKeySchema.safeParse(key);
  if (!parsedKey.success) {
    return { success: false, error: "Invalid privacy setting." };
  }

  switch (parsedKey.data) {
    case "privacyShowAge":
      await db.update(users).set({ privacyShowAge: value }).where(eq(users.id, user.id));
      break;
    case "privacyShowRegion":
      await db.update(users).set({ privacyShowRegion: value }).where(eq(users.id, user.id));
      break;
    case "privacyShowOnline":
      await db.update(users).set({ privacyShowOnline: value }).where(eq(users.id, user.id));
      break;
    case "privacyDiscoverable":
      await db.update(users).set({ privacyDiscoverable: value }).where(eq(users.id, user.id));
      break;
  }

  return { success: true };
}
