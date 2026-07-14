import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, users } from "@/db/schema";

// Same mocking rationale as resolve-posting-report.test.ts: requireRole
// is hardcoded to reject every real session until Admin Settings (024)
// ships the role column; @/auth is mocked so requireAuth() (used
// internally by resolvePostingReport, which this action delegates the
// "remove" half of its work to) succeeds with a real user.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { banPostingAuthor } = await import("./ban-posting-author");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `ban-posting-mod-${runId}@example.com`;
let moderatorId: string;

afterAll(async () => {
  await db.delete(users).where(eq(users.email, moderatorEmail));
});

async function seedAuthorAndPosting(alreadyBanned: boolean, runSuffix: string) {
  const [author] = await db
    .insert(users)
    .values({ email: `ban-posting-author-${runSuffix}@example.com`, handle: `banpostingauthor${runSuffix}`, bannedAt: alreadyBanned ? new Date() : null })
    .returning({ id: users.id });

  const [posting] = await db
    .insert(postings)
    .values({
      hostId: author.id,
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

  return { authorId: author.id, postingId: posting.id };
}

describe("banPostingAuthor", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    const [moderator] = await db
      .insert(users)
      .values({ email: moderatorEmail, handle: `banpostingmod${runId}` })
      .returning({ id: users.id });
    moderatorId = moderator.id;

    const { authorId, postingId } = await seedAuthorAndPosting(false, `${runId}-a`);

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(banPostingAuthor({ postingId })).rejects.toThrow();

    const [row] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, authorId));
    expect(row.bannedAt).toBeNull();

    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("bans a not-yet-banned author and removes the posting under review", async () => {
    const { authorId, postingId } = await seedAuthorAndPosting(false, `${runId}-b`);
    await db.insert(reports).values({ reporterId: moderatorId, targetType: "posting", targetId: postingId, reason: "harassment", status: "open" });

    // This action delegates to both toggleUserBan and resolvePostingReport,
    // each independently calling requireRole()/requireAuth() -- a
    // persistent mock (not "once") covers however many calls that chain
    // makes, rather than needing to count them exactly.
    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banPostingAuthor({ postingId });
    expect(result).toEqual({ success: true });

    const [authorRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, authorId));
    expect(authorRow.bannedAt).not.toBeNull();

    const [postingRow] = await db.select({ removedAt: postings.removedAt }).from(postings).where(eq(postings.id, postingId));
    expect(postingRow.removedAt).not.toBeNull();

    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, postingId));
    expect(reportRow.status).toBe("resolved");

    await db.delete(reports).where(eq(reports.targetId, postingId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("does not accidentally unban an author who is already banned", async () => {
    const { authorId, postingId } = await seedAuthorAndPosting(true, `${runId}-c`);

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banPostingAuthor({ postingId });
    expect(result).toEqual({ success: true });

    const [authorRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, authorId));
    expect(authorRow.bannedAt).not.toBeNull();

    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("returns an error for a nonexistent posting", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await banPostingAuthor({ postingId: crypto.randomUUID() });
    expect(result).toEqual({ success: false, error: "Posting not found." });
  });
});
