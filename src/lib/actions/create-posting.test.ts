import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { createPosting } = await import("./create-posting");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `post-verified-${runId}@example.com`;
const unverifiedEmail = `post-unverified-${runId}@example.com`;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const validInput = {
  game: "Valorant",
  genre: "FPS",
  title: "Ranked grind",
  blurb: "Need 2 for a serious climb.",
  tags: "chill, no-toxicity",
  vibe: "serious" as const,
  platform: "pc" as const,
  region: "eu-west" as const,
  ageGroup: "18" as const,
  timeSlots: ["evening" as const],
  scheduledDate: "",
  recurring: false,
  seatsTotal: 5,
  seatsOpen: 3,
  micRequired: true,
  voiceLink: "",
};

beforeAll(async () => {
  await db.insert(users).values([
    { email: verifiedEmail, handle: `postverified${runId}`, emailVerified: new Date() },
    { email: unverifiedEmail, handle: `postunverified${runId}` },
  ]);
});

afterAll(async () => {
  await db.delete(postings).where(eq(postings.title, validInput.title));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("createPosting", () => {
  it("inserts a row with status 'open' for a verified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createPosting(validInput);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");

    const [row] = await db.select().from(postings).where(eq(postings.id, result.id));
    expect(row.status).toBe("open");
    expect(row.game).toBe("Valorant");
    expect(row.tags).toEqual(["chill", "no-toxicity"]);
    // This account is brand-new and this is its first posting --
    // Admin Postings (017)'s auto-flag ruleset should catch it.
    expect(row.autoFlagReason).toBe("new_account_first_post");
  });

  it("blocks an unverified session and creates nothing (FR-017)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));

    const [beforeCount] = await db
      .select({ title: postings.title })
      .from(postings)
      .where(eq(postings.title, "Unverified attempt"));
    expect(beforeCount).toBeUndefined();

    const result = await createPosting({ ...validInput, title: "Unverified attempt" });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.error).toMatch(/verify your email/i);

    const rows = await db
      .select()
      .from(postings)
      .where(eq(postings.title, "Unverified attempt"));
    expect(rows).toHaveLength(0);
  });

  it("blocks a logged-out request and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await createPosting({ ...validInput, title: "Logged out attempt" });
    expect(result.success).toBe(false);

    const rows = await db
      .select()
      .from(postings)
      .where(eq(postings.title, "Logged out attempt"));
    expect(rows).toHaveLength(0);
  });

  it("rejects a missing game and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createPosting({ ...validInput, game: "", title: "Missing game" });
    expect(result.success).toBe(false);

    const rows = await db.select().from(postings).where(eq(postings.title, "Missing game"));
    expect(rows).toHaveLength(0);
  });

  it("rejects a missing title and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createPosting({ ...validInput, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a direct request bypassing the UI's stepper clamping (seatsOpen >= seatsTotal)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createPosting({
      ...validInput,
      title: "Bad steppers",
      seatsTotal: 3,
      seatsOpen: 3,
    });
    expect(result.success).toBe(false);

    const rows = await db.select().from(postings).where(eq(postings.title, "Bad steppers"));
    expect(rows).toHaveLength(0);
  });

  it("auto-flags a scam/phishing-pattern posting (017's FR-012)", async () => {
    const scamEmail = `post-scam-${runId}@example.com`;
    await db.insert(users).values({
      email: scamEmail,
      handle: `postscam${runId}`,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 365 * 86_400_000),
    });
    mockedAuth.mockResolvedValueOnce(fakeSession(scamEmail));

    const result = await createPosting({
      ...validInput,
      title: "FREE SKINS CLICK HERE",
      blurb: "Get free V-Bucks now, visit freevp.biz and claim now.",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");

    const [row] = await db.select().from(postings).where(eq(postings.id, result.id));
    expect(row.autoFlagReason).toBe("phishing_or_scam");

    await db.delete(postings).where(eq(postings.id, result.id));
    await db.delete(users).where(eq(users.email, scamEmail));
  });

  it("auto-flags a boosting-service posting (017's FR-012)", async () => {
    const boostEmail = `post-boost-${runId}@example.com`;
    await db.insert(users).values({
      email: boostEmail,
      handle: `postboost${runId}`,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 365 * 86_400_000),
    });
    mockedAuth.mockResolvedValueOnce(fakeSession(boostEmail));

    const result = await createPosting({
      ...validInput,
      title: "Cheap rank boosting, all regions",
      blurb: "Professional boosting service, DM for rates.",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");

    const [row] = await db.select().from(postings).where(eq(postings.id, result.id));
    expect(row.autoFlagReason).toBe("boosting_service");

    await db.delete(postings).where(eq(postings.id, result.id));
    await db.delete(users).where(eq(users.email, boostEmail));
  });

  it("does not auto-flag an unremarkable posting from an established account", async () => {
    const establishedEmail = `post-established-${runId}@example.com`;
    await db.insert(users).values({
      email: establishedEmail,
      handle: `postestablished${runId}`,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 365 * 86_400_000),
    });
    mockedAuth.mockResolvedValueOnce(fakeSession(establishedEmail));

    const result = await createPosting({ ...validInput, title: "Ranked grind, need one more" });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");

    const [row] = await db.select().from(postings).where(eq(postings.id, result.id));
    expect(row.autoFlagReason).toBeNull();

    await db.delete(postings).where(eq(postings.id, result.id));
    await db.delete(users).where(eq(users.email, establishedEmail));
  });
});
