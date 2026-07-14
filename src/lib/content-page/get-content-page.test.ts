import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { getContentPageBySlug } from "./get-content-page";

const runId = crypto.randomUUID().slice(0, 8);
const slug = `get-cp-${runId}`;

beforeAll(async () => {
  await db.insert(contentPages).values({
    slug,
    title: "Test page",
    status: "published",
    blocks: [{ type: "p", text: "Hello" }],
  });
});

afterAll(async () => {
  await db.delete(contentPages).where(eq(contentPages.slug, slug));
});

describe("getContentPageBySlug", () => {
  it("returns the page for an existing slug", async () => {
    const page = await getContentPageBySlug(slug);
    expect(page).not.toBeNull();
    expect(page?.title).toBe("Test page");
    expect(page?.status).toBe("published");
    expect(page?.blocks).toEqual([{ type: "p", text: "Hello" }]);
  });

  it("returns null for a nonexistent slug", async () => {
    const page = await getContentPageBySlug(`missing-${runId}`);
    expect(page).toBeNull();
  });
});
