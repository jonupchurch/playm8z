import { afterAll, describe, expect, it } from "vitest";
import { like } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";
import { checkRateLimit } from "./check-rate-limit";

describe("checkRateLimit (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);

  afterAll(async () => {
    await db.delete(rateLimitHits).where(like(rateLimitHits.bucket, `%${runId}%`));
  });

  it("allows up to the limit within a window, then blocks with a retry hint", async () => {
    const bucket = `test-limit:${runId}`;
    const limit = 3;
    const windowMs = 60_000;

    const results = [];
    for (let i = 0; i < 5; i++) results.push(await checkRateLimit(bucket, limit, windowMs));

    expect(results.slice(0, 3).every((r) => r.allowed)).toBe(true);
    expect(results[3].allowed).toBe(false);
    expect(results[4].allowed).toBe(false);
    if (!results[3].allowed) {
      expect(results[3].retryAfterSeconds).toBeGreaterThan(0);
      expect(results[3].retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("counts buckets independently", async () => {
    const a = `test-a:${runId}`;
    const b = `test-b:${runId}`;

    // Exhaust bucket A (limit 1).
    expect((await checkRateLimit(a, 1, 60_000)).allowed).toBe(true);
    expect((await checkRateLimit(a, 1, 60_000)).allowed).toBe(false);

    // B is untouched.
    expect((await checkRateLimit(b, 1, 60_000)).allowed).toBe(true);
  });
});
