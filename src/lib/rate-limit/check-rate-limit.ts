import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Postgres-backed fixed-window rate limiter (ADR 0020). Shared by the auth
 * entry points; keyed by an opaque `bucket` string (e.g. `login:203.0.113.7`).
 *
 * Atomic: the current window's counter is incremented in a single upsert,
 * so two concurrent requests can't both read the old count and lose an
 * increment. Each call also sweeps this bucket's expired windows, keeping
 * the table at ~one row per active bucket without a cron.
 *
 * Fails OPEN: if the limiter's own DB access errors, the request is allowed
 * rather than lock every legitimate user out of login over a transient
 * blip -- the ambiguous case here is real users, not attackers.
 */
export async function checkRateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  try {
    const [row] = await db
      .insert(rateLimitHits)
      .values({ bucket, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimitHits.bucket, rateLimitHits.windowStart],
        set: { count: sql`${rateLimitHits.count} + 1` },
      })
      .returning({ count: rateLimitHits.count });

    // Best-effort sweep of this bucket's rolled-over windows.
    await db
      .delete(rateLimitHits)
      .where(and(eq(rateLimitHits.bucket, bucket), lt(rateLimitHits.windowStart, windowStart)));

    if (row.count > limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((windowStart.getTime() + windowMs - now) / 1000),
      };
    }
    return { allowed: true };
  } catch (err) {
    console.error(`[rate-limit] check failed for bucket "${bucket}" -- failing open:`, err);
    return { allowed: true };
  }
}
