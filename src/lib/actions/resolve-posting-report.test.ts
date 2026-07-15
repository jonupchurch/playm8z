import { afterAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, postings, reports, users, warnings } from "@/db/schema";

// requireRole is mocked directly -- see toggle-user-ban.test.ts's own
// comment: its rank check is hardcoded to reject every real session
// until Admin Settings (024) adds the real `role` column. `@/auth` is
// separately mocked so requireAuth() (used to attribute the audit-log
// entry/warning to a real moderator row) succeeds with a real user.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { resolvePostingReport } = await import("./resolve-posting-report");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `resolve-posting-mod-${runId}@example.com`;
const authorEmail = `resolve-posting-author-${runId}@example.com`;
const reporterEmail = `resolve-posting-reporter-${runId}@example.com`;
let moderatorId: string;
let authorId: string;
let reporterId: string;
const postingIds: string[] = [];

async function seedPosting() {
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
      status: "open",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
    })
    .returning({ id: postings.id });
  postingIds.push(posting.id);
  return posting.id;
}

async function seedOpenReport(postingId: string) {
  await db.insert(reports).values({ reporterId, targetType: "posting", targetId: postingId, reason: "spam", status: "open" });
}

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(warnings).where(eq(warnings.moderatorId, moderatorId));
  await db.delete(reports).where(eq(reports.reporterId, reporterId));
  await db.delete(postings).where(eq(postings.hostId, authorId));
  await db.delete(users).where(eq(users.id, moderatorId));
  await db.delete(users).where(eq(users.id, authorId));
  await db.delete(users).where(eq(users.id, reporterId));
});

describe("resolvePostingReport", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    const [moderator] = await db
      .insert(users)
      .values({ email: moderatorEmail, handle: `resolvepostingmod${runId}` })
      .returning({ id: users.id });
    moderatorId = moderator.id;

    const [author] = await db
      .insert(users)
      .values({ email: authorEmail, handle: `resolvepostingauthor${runId}` })
      .returning({ id: users.id });
    authorId = author.id;

    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `resolvepostingreporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const postingId = await seedPosting();
    await seedOpenReport(postingId);

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(resolvePostingReport({ postingId, resolution: "approve" })).rejects.toThrow();

    const [row] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, postingId));
    expect(row.status).toBe("open");
  });

  it("approves: resolves open reports, marks reviewed, keeps the posting public, logs an audit entry", async () => {
    const postingId = await seedPosting();
    await seedOpenReport(postingId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolvePostingReport({ postingId, resolution: "approve" });
    expect(result).toEqual({ success: true });

    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, postingId));
    expect(reportRow.status).toBe("resolved");

    const [postingRow] = await db
      .select({ removedAt: postings.removedAt, moderationReviewedAt: postings.moderationReviewedAt })
      .from(postings)
      .where(eq(postings.id, postingId));
    expect(postingRow.removedAt).toBeNull();
    expect(postingRow.moderationReviewedAt).not.toBeNull();

    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, postingId), eq(auditEntries.action, "approved a posting")));
    expect(entry.actorId).toBe(moderatorId);
    expect(entry.category).toBe("moderation");
  });

  it("removes: resolves open reports, sets removedAt (not moderationReviewedAt), logs an audit entry", async () => {
    const postingId = await seedPosting();
    await seedOpenReport(postingId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolvePostingReport({ postingId, resolution: "remove" });
    expect(result).toEqual({ success: true });

    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, postingId));
    expect(reportRow.status).toBe("resolved");

    const [postingRow] = await db
      .select({ removedAt: postings.removedAt, moderationReviewedAt: postings.moderationReviewedAt })
      .from(postings)
      .where(eq(postings.id, postingId));
    expect(postingRow.removedAt).not.toBeNull();
    expect(postingRow.moderationReviewedAt).toBeNull();

    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, postingId), eq(auditEntries.action, "removed a posting")));
    expect(entry.actorId).toBe(moderatorId);
  });

  it("warns: resolves open reports, marks reviewed, creates a warnings row, logs an audit entry", async () => {
    const postingId = await seedPosting();
    await seedOpenReport(postingId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolvePostingReport({ postingId, resolution: "warn", warningReason: "second offense" });
    expect(result).toEqual({ success: true });

    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, postingId));
    expect(reportRow.status).toBe("resolved");

    const [postingRow] = await db
      .select({ removedAt: postings.removedAt, moderationReviewedAt: postings.moderationReviewedAt })
      .from(postings)
      .where(eq(postings.id, postingId));
    expect(postingRow.removedAt).toBeNull();
    expect(postingRow.moderationReviewedAt).not.toBeNull();

    const [warningRow] = await db.select().from(warnings).where(and(eq(warnings.targetType, "posting"), eq(warnings.targetId, postingId)));
    expect(warningRow.userId).toBe(authorId);
    expect(warningRow.moderatorId).toBe(moderatorId);
    expect(warningRow.reason).toBe("second offense");

    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, postingId), eq(auditEntries.action, "warned a posting's author")));
    expect(entry.actorId).toBe(moderatorId);
  });

  it("returns an error for a nonexistent posting", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolvePostingReport({ postingId: crypto.randomUUID(), resolution: "approve" });
    expect(result).toEqual({ success: false, error: "Posting not found." });
  });
});
