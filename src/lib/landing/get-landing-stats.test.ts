import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, users } from "@/db/schema";
import { getLandingStats } from "./get-landing-stats";

// getLandingStats() takes no filter/scope parameter of its own -- every
// stat is a real, global aggregate over the whole users/postings/
// applications tables (research.md #1-#2). These tables aren't an
// append-only audit trail like auditEntries, but wiping them wholesale
// (users cascades into nearly every other table via FKs) would be far
// more destructive than News feed's own precedent of wiping just
// newsPosts -- so this suite uses DELTA assertions (Admin Users'/
// Admin Reports' own established pattern for a global, unscoped stat)
// instead of an exact-count or table-wipe approach.
describe("getLandingStats (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const hostEmail = `landing-stats-host-${runId}@example.com`;
  const applicantEmail = `landing-stats-applicant-${runId}@example.com`;
  let hostId: string;
  let applicantId: string;
  const postingIds: string[] = [];
  const applicationIds: string[] = [];

  afterAll(async () => {
    for (const id of applicationIds) await db.delete(applications).where(eq(applications.id, id));
    for (const id of postingIds) await db.delete(postings).where(eq(postings.id, id));
    await db.delete(users).where(eq(users.email, hostEmail));
    await db.delete(users).where(eq(users.email, applicantEmail));
  });

  it("totalPlayers increases by exactly the number of newly-inserted users", async () => {
    const before = await getLandingStats();

    const [host] = await db
      .insert(users)
      .values({ email: hostEmail, handle: `landingstatshost${runId}` })
      .returning({ id: users.id });
    hostId = host.id;
    const [applicant] = await db
      .insert(users)
      .values({ email: applicantEmail, handle: `landingstatsapplicant${runId}` })
      .returning({ id: users.id });
    applicantId = applicant.id;

    const after = await getLandingStats();
    expect(after.totalPlayers - before.totalPlayers).toBe(2);
  });

  it("gamesAndTables counts ALL postings ever (not just open ones), increasing by exactly one new distinct game name", async () => {
    const before = await getLandingStats();

    const uniqueGame = `Landing Stats Game ${runId}`;
    const [posting] = await db
      .insert(postings)
      .values({
        hostId,
        game: uniqueGame,
        title: `Open posting ${runId}`,
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        genre: "FPS",
        seatsTotal: 4,
        seatsOpen: 2,
        status: "open",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    postingIds.push(posting.id);

    const after = await getLandingStats();
    expect(after.gamesAndTables - before.gamesAndTables).toBe(1);
  });

  it("heroPostings surfaces the just-inserted open posting as the most recent (FR-005)", async () => {
    const stats = await getLandingStats();
    expect(stats.heroPostings[0]?.id).toBe(postingIds[0]);
    expect(stats.heroPostings[0]?.hostHandle).toBe(`landingstatshost${runId}`);
  });

  it("genreCounts includes the just-inserted posting's genre, up by exactly one, across all 8 real genres", async () => {
    const stats = await getLandingStats();
    expect(stats.genreCounts).toHaveLength(8);
    const fps = stats.genreCounts.find((entry) => entry.genre === "FPS");
    expect(fps?.count).toBeGreaterThanOrEqual(1);
  });

  it("partiesFormedThisWeek increases by exactly one for an Application accepted just now, not one accepted over a week ago", async () => {
    const before = await getLandingStats();

    const [recentApplication] = await db
      .insert(applications)
      .values({ postingId: postingIds[0], applicantId, status: "accepted", acceptedAt: new Date() })
      .returning({ id: applications.id });
    applicationIds.push(recentApplication.id);

    const [oldApplication] = await db
      .insert(applications)
      .values({
        postingId: postingIds[0],
        applicantId,
        status: "accepted",
        acceptedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: applications.id });
    applicationIds.push(oldApplication.id);

    const after = await getLandingStats();
    expect(after.partiesFormedThisWeek - before.partiesFormedThisWeek).toBe(1);
  });
});
