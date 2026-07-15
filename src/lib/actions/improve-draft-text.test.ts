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
const { improveDraftText } = await import("./improve-draft-text");
const mockedGenerateText = generateText as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const adminEmail = `improve-draft-admin-${runId}@example.com`;
const moderatorEmail = `improve-draft-mod-${runId}@example.com`;
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

describe("improveDraftText", () => {
  it("rejects a moderator session before any AI call is made", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `improvedraftmod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    await expect(improveDraftText({ text: "Some existing draft text.", surface: "news" })).rejects.toThrow();
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("rejects empty text before any AI call is made", async () => {
    const [admin] = await db.insert(users).values({ email: adminEmail, handle: `improvedraftadmin${runId}`, role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));

    const result = await improveDraftText({ text: "   ", surface: "news" });
    expect(result.success).toBe(false);
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("returns revised plain text for an admin session and logs an audit entry (news surface)", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    mockedGenerateText.mockResolvedValue({ text: "A much better sentence." });

    const result = await improveDraftText({ text: "A sentence.", surface: "news" });
    expect(result).toEqual({ success: true, text: "A much better sentence." });

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((e) => e.category === "content" && (e.meta as { surface?: string })?.surface === "news")).toBe(
      true,
    );
  });

  it("is surface-agnostic -- the same action serves a contentPage caller too", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    mockedGenerateText.mockResolvedValue({ text: "A revised block." });

    const result = await improveDraftText({ text: "A block.", surface: "contentPage" });
    expect(result).toEqual({ success: true, text: "A revised block." });

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(
      entries.some((e) => e.category === "content" && (e.meta as { surface?: string })?.surface === "contentPage"),
    ).toBe(true);
  });

  it("returns a friendly error and logs nothing when the AI call fails", async () => {
    mockedAuth.mockResolvedValue(fakeSession(adminEmail));
    mockedGenerateText.mockRejectedValue(new Error("network timeout"));

    const before = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    const result = await improveDraftText({ text: "A sentence.", surface: "news" });
    expect(result.success).toBe(false);

    const after = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(after.length).toBe(before.length);
  });
});
