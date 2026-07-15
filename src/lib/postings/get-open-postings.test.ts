import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, settings, users } from "@/db/schema";
import { invalidateSettingsCache } from "@/lib/settings/get-settings";
import { getOpenPostings } from "./get-open-postings";

// Admin Settings (024)/research.md #2: enables/disables the computed
// auto-hide rule and resets get-settings.ts's own cache so the change
// is visible immediately, not after its 5s TTL.
async function setAutoHide(enabled: boolean, threshold = 3) {
  const [row] = await db.select().from(settings).limit(1);
  if (!row) {
    await db.insert(settings).values({ autoHideEnabled: enabled, autoHideThreshold: threshold });
  } else {
    await db.update(settings).set({ autoHideEnabled: enabled, autoHideThreshold: threshold }).where(eq(settings.id, row.id));
  }
  invalidateSettingsCache();
}

const runId = crypto.randomUUID().slice(0, 8);
const email = `home-open-postings-${runId}@example.com`;
let hostId: string;

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email, handle: `testhost${runId}`, avatarColor: "amber-orange" })
    .returning({ id: users.id });
  hostId = host.id;

  const common = {
    hostId,
    blurb: "blurb",
    genre: "FPS",
    ageGroup: "18",
    timeSlots: ["evening"],
    platform: "pc",
    micRequired: false,
  };

  await db.insert(postings).values([
    {
      ...common,
      game: `OpenGame-${runId}`,
      title: "Open one",
      vibe: "fun",
      region: "na-west",
      seatsTotal: 4,
      seatsOpen: 2,
      status: "open",
    },
    {
      ...common,
      game: `FullGame-${runId}`,
      title: "Full one",
      vibe: "serious",
      region: "eu-west",
      seatsTotal: 4,
      seatsOpen: 0,
      status: "full",
    },
    {
      ...common,
      game: `ClosedGame-${runId}`,
      title: "Closed one",
      vibe: "fun",
      region: "na-east",
      seatsTotal: 4,
      seatsOpen: 1,
      status: "closed",
    },
    {
      ...common,
      game: `RemovedGame-${runId}`,
      title: "Removed one",
      vibe: "fun",
      region: "na-west",
      seatsTotal: 4,
      seatsOpen: 2,
      status: "open",
      removedAt: new Date(),
    },
  ]);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

afterEach(async () => {
  await setAutoHide(false);
});

describe("getOpenPostings", () => {
  it("returns only rows with status = 'open', with the real host's handle/avatar", async () => {
    const result = await getOpenPostings();
    const games = result.map((row) => row.game);

    expect(games).toContain(`OpenGame-${runId}`);
    expect(games).not.toContain(`FullGame-${runId}`);
    expect(games).not.toContain(`ClosedGame-${runId}`);

    const openRow = result.find((row) => row.game === `OpenGame-${runId}`);
    expect(openRow?.hostHandle).toBe(`testhost${runId}`);
    expect(openRow?.hostAvatarColor).toBe("amber-orange");
    expect(openRow?.seatsOpen).toBe(2);
    expect(openRow?.seatsTotal).toBe(4);
  });

  it("excludes an open posting a moderator has removed (Admin Users 016's FR-009)", async () => {
    const result = await getOpenPostings();
    expect(result.map((row) => row.game)).not.toContain(`RemovedGame-${runId}`);
  });

  it("excludes a posting whose open-report count meets the configured auto-hide threshold, and un-hides it once resolved (024/research.md #2)", async () => {
    const [reportedPosting] = await db
      .insert(postings)
      .values({
        hostId,
        game: `AutoHideGame-${runId}`,
        title: "Auto-hide candidate",
        blurb: "blurb",
        genre: "FPS",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
        micRequired: false,
        vibe: "fun",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 2,
        status: "open",
      })
      .returning({ id: postings.id });

    const [reporterA, reporterB] = await Promise.all([
      db.insert(users).values({ email: `autohide-a-${runId}@example.com`, handle: `autohidea${runId}` }).returning({ id: users.id }),
      db.insert(users).values({ email: `autohide-b-${runId}@example.com`, handle: `autohideb${runId}` }).returning({ id: users.id }),
    ]);

    await db.insert(reports).values([
      { reporterId: reporterA[0].id, targetType: "posting", targetId: reportedPosting.id, status: "open" },
      { reporterId: reporterB[0].id, targetType: "posting", targetId: reportedPosting.id, status: "open" },
    ]);

    await setAutoHide(true, 2);
    const hidden = await getOpenPostings();
    expect(hidden.map((row) => row.game)).not.toContain(`AutoHideGame-${runId}`);

    await db.update(reports).set({ status: "resolved" }).where(eq(reports.targetId, reportedPosting.id));
    const visibleAgain = await getOpenPostings();
    expect(visibleAgain.map((row) => row.game)).toContain(`AutoHideGame-${runId}`);

    await db.delete(postings).where(eq(postings.id, reportedPosting.id));
    await db.delete(users).where(eq(users.email, `autohide-a-${runId}@example.com`));
    await db.delete(users).where(eq(users.email, `autohide-b-${runId}@example.com`));
  });
});
