import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, users } from "@/db/schema";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { dismissReport } = await import("./dismiss-report");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const reporterEmail = `dismiss-report-reporter-${runId}@example.com`;
const authorEmail = `dismiss-report-author-${runId}@example.com`;
let reporterId: string;
let authorId: string;
let postingId: string;
const reportIds: string[] = [];

afterAll(async () => {
  for (const id of reportIds) await db.delete(reports).where(eq(reports.id, id));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.id, reporterId));
  await db.delete(users).where(eq(users.id, authorId));
});

describe("dismissReport", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    const [reporter] = await db.insert(users).values({ email: reporterEmail, handle: `dismissreporter${runId}` }).returning({ id: users.id });
    reporterId = reporter.id;
    const [author] = await db.insert(users).values({ email: authorEmail, handle: `dismissauthor${runId}` }).returning({ id: users.id });
    authorId = author.id;
    const [posting] = await db
      .insert(postings)
      .values({
        hostId: authorId,
        game: "Test Game",
        title: "Test posting",
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 4,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    postingId = posting.id;

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(dismissReport({ targetType: "posting", targetId: postingId })).rejects.toThrow();
  });

  it("resolves every open report against the target, any target type, without touching content", async () => {
    const inserted = await db
      .insert(reports)
      .values([
        { reporterId, targetType: "posting", targetId: postingId, reason: "spam", status: "open" },
        { reporterId, targetType: "posting", targetId: postingId, reason: "harassment", status: "open" },
      ])
      .returning({ id: reports.id });
    reportIds.push(...inserted.map((r) => r.id));

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await dismissReport({ targetType: "posting", targetId: postingId });
    expect(result).toEqual({ success: true });

    const rows = await db.select({ status: reports.status, resolvedAt: reports.resolvedAt }).from(reports).where(eq(reports.targetId, postingId));
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.status).toBe("resolved");
      expect(row.resolvedAt).not.toBeNull();
    }

    const [postingRow] = await db
      .select({ removedAt: postings.removedAt, moderationReviewedAt: postings.moderationReviewedAt })
      .from(postings)
      .where(eq(postings.id, postingId));
    expect(postingRow.removedAt).toBeNull();
    expect(postingRow.moderationReviewedAt).toBeNull();
  });

  it("returns an error when there are no open reports for the target", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await dismissReport({ targetType: "posting", targetId: crypto.randomUUID() });
    expect(result).toEqual({ success: false, error: "No open reports found for this target." });
  });
});
