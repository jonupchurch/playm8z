import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, users } from "@/db/schema";
import { getDashboardKpis } from "./get-dashboard-kpis";

// Every KPI here is a genuinely global aggregate (total users, open
// postings/reports across the whole platform) -- other test files'
// own fixtures coexist in the same tables. Rather than clearing shared
// tables (get-forum-stats.test.ts's approach, viable there since it
// owns forumThreads outright), this asserts each KPI's *delta* after
// inserting a known fixture, which stays correct regardless of
// whatever else exists.
describe("getDashboardKpis (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `dashboard-kpi-${runId}@example.com`;
  let userId: string;
  let postingId: string;
  let reportId: string;

  afterAll(async () => {
    await db.delete(reports).where(eq(reports.id, reportId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("reflects a fresh signup, an open posting, and an open report as +1 deltas", async () => {
    const before = await getDashboardKpis();

    const [user] = await db
      .insert(users)
      .values({ email, handle: `dashkpi${runId}` })
      .returning({ id: users.id });
    userId = user.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: userId,
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
    postingId = posting.id;

    const [report] = await db
      .insert(reports)
      .values({ reporterId: userId, targetType: "user", targetId: crypto.randomUUID(), status: "open" })
      .returning({ id: reports.id });
    reportId = report.id;

    const after = await getDashboardKpis();

    expect(after.totalUsers - before.totalUsers).toBe(1);
    expect(after.newSignupsToday - before.newSignupsToday).toBe(1);
    expect(after.livePostings - before.livePostings).toBe(1);
    expect(after.openReports - before.openReports).toBe(1);
    // The new host's own posting counts as "active today" for them.
    expect(after.activeToday - before.activeToday).toBe(1);
  });

  it("doesn't count a non-open posting toward livePostings or a resolved report toward openReports", async () => {
    const before = await getDashboardKpis();

    const [closedUser] = await db
      .insert(users)
      .values({ email: `dashboard-kpi-closed-${runId}@example.com`, handle: `dashkpiclosed${runId}` })
      .returning({ id: users.id });

    const [closedPosting] = await db
      .insert(postings)
      .values({
        hostId: closedUser.id,
        game: "Test Game",
        title: "Closed posting",
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 0,
        status: "full",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });

    const [resolvedReport] = await db
      .insert(reports)
      .values({ reporterId: closedUser.id, targetType: "user", targetId: crypto.randomUUID(), status: "resolved" })
      .returning({ id: reports.id });

    const after = await getDashboardKpis();

    expect(after.livePostings).toBe(before.livePostings);
    expect(after.openReports).toBe(before.openReports);

    await db.delete(reports).where(eq(reports.id, resolvedReport.id));
    await db.delete(postings).where(eq(postings.id, closedPosting.id));
    await db.delete(users).where(eq(users.id, closedUser.id));
  });
});
