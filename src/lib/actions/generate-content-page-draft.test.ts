import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config: unknown) => config) },
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { generateText } = await import("ai");
const { auth } = await import("@/auth");
const { generateContentPageDraft } = await import("./generate-content-page-draft");
const mockedGenerateText = generateText as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `gen-cp-draft-admin-${runId}@example.com`;
const moderatorEmail = `gen-cp-draft-mod-${runId}@example.com`;
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

describe("generateContentPageDraft", () => {
  it("rejects a moderator session before any AI call is made", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `gencpmod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(generateContentPageDraft({ topic: "Community guidelines" })).rejects.toThrow();
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("rejects an empty topic before any AI call is made", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `gencpadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const result = await generateContentPageDraft({ topic: "" });
    expect(result.success).toBe(false);
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("returns a validated set of blocks for an admin session and logs an audit entry", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    mockedGenerateText.mockResolvedValue({
      output: {
        blocks: [
          { type: "h2", text: "Community Guidelines" },
          { type: "p", text: "Be kind to your fellow players." },
        ],
      },
    });

    const result = await generateContentPageDraft({ topic: "Community guidelines" });
    expect(result).toEqual({
      success: true,
      draft: {
        blocks: [
          { type: "h2", text: "Community Guidelines" },
          { type: "p", text: "Be kind to your fellow players." },
        ],
      },
    });

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.category === "content" && e.action.includes("AI"))).toBe(true);
  });

  it("returns a friendly error and logs nothing when the AI returns invalid blocks", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    mockedGenerateText.mockResolvedValue({ output: { blocks: [{ type: "bogus" }] } });

    const before = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    const result = await generateContentPageDraft({ topic: "Community guidelines" });
    expect(result.success).toBe(false);

    const after = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(after.length).toBe(before.length);
  });
});
