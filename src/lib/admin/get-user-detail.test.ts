import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, postings, reports, users } from "@/db/schema";
import { getUserDetail } from "./get-user-detail";

describe("getUserDetail (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `user-detail-${runId}@example.com`;
  const reporterEmail = `user-detail-reporter-${runId}@example.com`;
  let userId: string;
  let reporterId: string;
  let openPostingId: string;
  let removedPostingId: string;
  let openThreadId: string;
  let removedThreadId: string;
  let reportId: string;

  afterAll(async () => {
    await db.delete(reports).where(eq(reports.id, reportId));
    await db.delete(forumThreads).where(eq(forumThreads.authorId, userId));
    await db.delete(postings).where(eq(postings.hostId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, reporterId));
  });

  it("returns null for a nonexistent user", async () => {
    const result = await getUserDetail("00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("returns join date, region, open-report count, and only non-removed content", async () => {
    const [user] = await db
      .insert(users)
      .values({ email, handle: `userdetail${runId}`, region: "na-west" })
      .returning({ id: users.id });
    userId = user.id;

    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `userdetailreporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const [openPosting] = await db
      .insert(postings)
      .values({
        hostId: userId,
        game: "Test Game",
        title: "Open posting",
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
    openPostingId = openPosting.id;

    const [removedPosting] = await db
      .insert(postings)
      .values({
        hostId: userId,
        game: "Test Game",
        title: "Removed posting",
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 4,
        status: "open",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
        removedAt: new Date(),
      })
      .returning({ id: postings.id });
    removedPostingId = removedPosting.id;

    const [openThread] = await db
      .insert(forumThreads)
      .values({ authorId: userId, categoryId: "general", title: "Open thread", body: "body" })
      .returning({ id: forumThreads.id });
    openThreadId = openThread.id;

    const [removedThread] = await db
      .insert(forumThreads)
      .values({ authorId: userId, categoryId: "general", title: "Removed thread", body: "body", removedAt: new Date() })
      .returning({ id: forumThreads.id });
    removedThreadId = removedThread.id;

    const [report] = await db
      .insert(reports)
      .values({ reporterId, targetType: "user", targetId: userId, status: "open" })
      .returning({ id: reports.id });
    reportId = report.id;

    const detail = await getUserDetail(userId);
    expect(detail).not.toBeNull();
    expect(detail!.handle).toBe(`userdetail${runId}`);
    expect(detail!.region).toBe("na-west");
    expect(detail!.openReportCount).toBe(1);

    expect(detail!.postings.map((p) => p.id)).toEqual([openPostingId]);
    expect(detail!.postings.map((p) => p.id)).not.toContain(removedPostingId);

    expect(detail!.forumThreads.map((t) => t.id)).toEqual([openThreadId]);
    expect(detail!.forumThreads.map((t) => t.id)).not.toContain(removedThreadId);
  });
});
