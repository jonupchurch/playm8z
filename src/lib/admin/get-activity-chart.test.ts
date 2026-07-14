import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { getActivityChart } from "./get-activity-chart";

describe("getActivityChart (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `activity-chart-${runId}@example.com`;
  const oldEmail = `activity-chart-old-${runId}@example.com`;
  let userId: string;
  let oldUserId: string;
  let postingId: string;

  afterAll(async () => {
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, oldUserId));
  });

  it("returns 7 days, most recent last, with today's fixture reflected only in today's bucket", async () => {
    const before = await getActivityChart();
    expect(before).toHaveLength(7);

    const [user] = await db
      .insert(users)
      .values({ email, handle: `actchart${runId}` })
      .returning({ id: users.id });
    userId = user.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: userId,
        game: "Test Game",
        title: "Today's posting",
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

    // A user created 10 days ago is outside the 7-day window entirely.
    const [oldUser] = await db
      .insert(users)
      .values({ email: oldEmail, handle: `actchartold${runId}`, createdAt: new Date(Date.now() - 10 * 86_400_000) })
      .returning({ id: users.id });
    oldUserId = oldUser.id;

    const after = await getActivityChart();
    expect(after).toHaveLength(7);

    const todayBefore = before[6];
    const todayAfter = after[6];
    expect(todayAfter.date).toBe(todayBefore.date);
    expect(todayAfter.signups - todayBefore.signups).toBe(1);
    expect(todayAfter.postings - todayBefore.postings).toBe(1);
    expect(todayAfter.active - todayBefore.active).toBe(1);

    // The 10-day-old signup shows up in none of the 7 visible days.
    for (let i = 0; i < 7; i++) {
      if (i === 6) continue;
      expect(after[i].signups).toBe(before[i].signups);
    }
  });
});
