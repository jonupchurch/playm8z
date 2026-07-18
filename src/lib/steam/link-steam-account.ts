import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type LinkResult = "linked" | "already-linked-elsewhere";

// Drizzle wraps postgres.js errors in DrizzleQueryError -- the real Postgres
// code is at err.cause.code, NOT err.code.
function isUniqueViolation(err: unknown): boolean {
  const code =
    err && typeof err === "object"
      ? ((err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code)
      : undefined;
  return code === "23505";
}

/**
 * Link a verified SteamID to a playm8z account (038). One Steam account maps
 * to at most one account: if the SteamID is already on a DIFFERENT user, the
 * link is refused and nothing is written. The app-level check is the friendly
 * path; the `users.steamId` unique index is the race backstop.
 */
export async function linkSteamAccount(userId: string, steamId: string): Promise<LinkResult> {
  const [clash] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.steamId, steamId), ne(users.id, userId)))
    .limit(1);
  if (clash) return "already-linked-elsewhere";

  try {
    await db.update(users).set({ steamId, steamConnectedAt: new Date() }).where(eq(users.id, userId));
  } catch (err) {
    if (isUniqueViolation(err)) return "already-linked-elsewhere";
    throw err;
  }
  return "linked";
}
