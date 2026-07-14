import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, postings, reports, users } from "@/db/schema";
import { searchAdminUsers } from "./search-admin-users";

describe("searchAdminUsers (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const activeEmail = `admin-users-active-${runId}@example.com`;
  const flaggedEmail = `admin-users-flagged-${runId}@example.com`;
  const bannedEmail = `admin-users-banned-${runId}@example.com`;
  let activeId: string;
  let flaggedId: string;
  let bannedId: string;
  let postingId: string;
  let threadId: string;
  let reportId: string;

  afterAll(async () => {
    await db.delete(reports).where(eq(reports.id, reportId));
    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(eq(users.id, activeId));
    await db.delete(users).where(eq(users.id, flaggedId));
    await db.delete(users).where(eq(users.id, bannedId));
  });

  it("computes status (active/flagged/banned), accurate content counts, and matches search+filter", async () => {
    const before = await searchAdminUsers({ q: "", status: "all" });

    const [active] = await db
      .insert(users)
      .values({ email: activeEmail, handle: `adminusersactive${runId}`, region: "na-west" })
      .returning({ id: users.id });
    activeId = active.id;

    const [flagged] = await db
      .insert(users)
      .values({ email: flaggedEmail, handle: `adminusersflagged${runId}` })
      .returning({ id: users.id });
    flaggedId = flagged.id;

    const [banned] = await db
      .insert(users)
      .values({ email: bannedEmail, handle: `adminusersbanned${runId}`, bannedAt: new Date() })
      .returning({ id: users.id });
    bannedId = banned.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: activeId,
        game: "Test Game",
        title: "Active user's posting",
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
    postingId = posting.id;

    const [thread] = await db
      .insert(forumThreads)
      .values({ authorId: activeId, categoryId: "general", title: "Active user's thread", body: "body" })
      .returning({ id: forumThreads.id });
    threadId = thread.id;

    const [report] = await db
      .insert(reports)
      .values({ reporterId: activeId, targetType: "user", targetId: flaggedId, status: "open" })
      .returning({ id: reports.id });
    reportId = report.id;

    const after = await searchAdminUsers({ q: "", status: "all" });
    expect(after.stats.total - before.stats.total).toBe(3);
    expect(after.stats.active - before.stats.active).toBe(1);
    expect(after.stats.flagged - before.stats.flagged).toBe(1);
    expect(after.stats.banned - before.stats.banned).toBe(1);

    const activeRow = after.rows.find((r) => r.id === activeId)!;
    expect(activeRow.status).toBe("active");
    expect(activeRow.postingCount).toBe(1);
    expect(activeRow.forumThreadCount).toBe(1);
    expect(activeRow.openReportCount).toBe(0);

    const flaggedRow = after.rows.find((r) => r.id === flaggedId)!;
    expect(flaggedRow.status).toBe("flagged");
    expect(flaggedRow.openReportCount).toBe(1);

    const bannedRow = after.rows.find((r) => r.id === bannedId)!;
    expect(bannedRow.status).toBe("banned");

    const searchByHandle = await searchAdminUsers({ q: `adminusersactive${runId}`, status: "all" });
    expect(searchByHandle.rows.map((r) => r.id)).toEqual([activeId]);

    const searchByEmail = await searchAdminUsers({ q: bannedEmail, status: "all" });
    expect(searchByEmail.rows.map((r) => r.id)).toEqual([bannedId]);

    const filterFlagged = await searchAdminUsers({ q: "", status: "flagged" });
    expect(filterFlagged.rows.some((r) => r.id === activeId)).toBe(false);
    expect(filterFlagged.rows.some((r) => r.id === flaggedId)).toBe(true);
    expect(filterFlagged.rows.some((r) => r.id === bannedId)).toBe(false);

    const noMatches = await searchAdminUsers({ q: `no-such-user-${runId}`, status: "all" });
    expect(noMatches.rows).toEqual([]);
  });
});
