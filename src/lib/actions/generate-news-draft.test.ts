import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";

// research.md #7: `ai` is mocked so no real network call is ever made
// in tests -- generateStructuredDraft()'s own wrapping (Output.object,
// model string) is exercised for real; only the network boundary is
// stubbed.
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config: unknown) => config) },
}));
// Only `@/auth` is mocked -- requireRole()/requireAuth() run for real
// against a real seeded `role` column, matching Admin Settings' (024)
// own established pattern.
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { generateText } = await import("ai");
const { auth } = await import("@/auth");
const { generateNewsDraft } = await import("./generate-news-draft");
const mockedGenerateText = generateText as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `gen-news-draft-admin-${runId}@example.com`;
const moderatorEmail = `gen-news-draft-mod-${runId}@example.com`;
let adminId: string;

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.email, adminEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
});

afterEach(() => {
  mockedAuth.mockReset();
  mockedGenerateText.mockReset();
});

describe("generateNewsDraft", () => {
  it("rejects a moderator session before any AI call is made", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `gennewsmod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(generateNewsDraft({ topic: "A community game night" })).rejects.toThrow();
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("rejects an empty topic before any AI call is made", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `gennewsadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const result = await generateNewsDraft({ topic: "   " });
    expect(result.success).toBe(false);
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("returns a validated draft for an admin session and logs an audit entry", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    mockedGenerateText.mockResolvedValue({
      output: { title: "Community Game Night", excerpt: "Join us this Friday.", body: "Full details inside." },
    });

    const result = await generateNewsDraft({ topic: "A community game night" });
    expect(result).toEqual({
      success: true,
      draft: { title: "Community Game Night", excerpt: "Join us this Friday.", body: "Full details inside." },
    });

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.category === "content" && e.action.includes("AI"))).toBe(true);
  });

  it("returns a friendly error and logs nothing when the AI call fails", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    mockedGenerateText.mockRejectedValue(new Error("network timeout"));

    const before = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    const result = await generateNewsDraft({ topic: "A community game night" });
    expect(result.success).toBe(false);

    const after = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(after.length).toBe(before.length);
  });
});
