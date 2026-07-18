"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";

export type DisconnectResult = { success: true };

// FR-008: unlink Steam. Clears the link only -- imported games are the
// player's games now and are LEFT in place (removing them would be
// surprising; the player prunes any by hand via the games list).
export async function disconnectSteam(): Promise<DisconnectResult> {
  const user = await requireAuth();
  await db.update(users).set({ steamId: null, steamConnectedAt: null }).where(eq(users.id, user.id));
  revalidatePath("/profile/account");
  return { success: true };
}
