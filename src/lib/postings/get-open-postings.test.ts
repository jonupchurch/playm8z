import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { getOpenPostings } from "./get-open-postings";

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
  ]);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
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
});
