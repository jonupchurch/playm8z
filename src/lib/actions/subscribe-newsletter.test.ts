import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { subscribeNewsletter } from "./subscribe-newsletter";

describe("subscribeNewsletter (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `subscriber-${runId}@example.com`;

  afterAll(async () => {
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
  });

  it("creates a subscriber record for a valid email, requiring no login", async () => {
    const result = await subscribeNewsletter({ email });
    expect(result).toEqual({ success: true, alreadySubscribed: false });

    const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
    expect(row).toBeDefined();
  });

  it("rejects a malformed email and creates no record", async () => {
    const result = await subscribeNewsletter({ email: "not-an-email" });
    expect(result.success).toBe(false);

    const rows = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, "not-an-email"));
    expect(rows).toHaveLength(0);
  });

  it("doesn't create a duplicate record for an already-subscribed email", async () => {
    const result = await subscribeNewsletter({ email });
    expect(result).toEqual({ success: true, alreadySubscribed: true });

    const rows = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
    expect(rows).toHaveLength(1);
  });
});
