import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, notifications, postings, users } from "@/db/schema";
import { getNotifications } from "./get-notifications";

describe("getNotifications (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const hostEmail = `notif-host-${runId}@example.com`;
  const applicantEmail = `notif-applicant-${runId}@example.com`;

  let hostId: string;
  let applicantId: string;
  let postingId: string;
  let pendingApplicationId: string;
  let acceptedApplicationId: string;
  let withdrawnApplicationId: string;

  beforeAll(async () => {
    const [host] = await db
      .insert(users)
      .values({ email: hostEmail, handle: `notifhost${runId}` })
      .returning({ id: users.id });
    hostId = host.id;

    const [applicant] = await db
      .insert(users)
      .values({ email: applicantEmail, handle: `notifapplicant${runId}` })
      .returning({ id: users.id });
    applicantId = applicant.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId,
        game: `Helldivers ${runId}`,
        title: `Dive night ${runId}`,
        blurb: "Casual dives",
        vibe: "casual",
        region: "na-east",
        seatsTotal: 4,
        seatsOpen: 2,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    postingId = posting.id;

    const [pending] = await db
      .insert(applications)
      .values({ postingId, applicantId, status: "pending" })
      .returning({ id: applications.id });
    pendingApplicationId = pending.id;

    const [accepted] = await db
      .insert(applications)
      .values({ postingId, applicantId, status: "accepted" })
      .returning({ id: applications.id });
    acceptedApplicationId = accepted.id;

    const [withdrawn] = await db
      .insert(applications)
      .values({ postingId, applicantId, status: "withdrawn" })
      .returning({ id: applications.id });
    withdrawnApplicationId = withdrawn.id;

    await db.insert(notifications).values({
      userId: hostId,
      type: "news",
      text: `Seeded news item ${runId}`,
      targetRef: "/news/seeded",
    });
  });

  afterAll(async () => {
    await db.delete(applications).where(eq(applications.postingId, postingId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(notifications).where(eq(notifications.userId, hostId));
    await db.delete(users).where(eq(users.email, hostEmail));
    await db.delete(users).where(eq(users.email, applicantEmail));
  });

  it("includes a real notification row", async () => {
    const items = await getNotifications(hostId);
    const seeded = items.find((item) => item.kind === "notification" && item.type === "news");
    expect(seeded).toBeDefined();
  });

  it("synthesizes a pending Application as an unread request item", async () => {
    const items = await getNotifications(hostId);
    const pending = items.find((item) => item.kind === "request" && item.id === pendingApplicationId);
    expect(pending).toBeDefined();
    expect(pending?.kind === "request" && pending.status).toBe("pending");
    expect(pending?.kind === "request" && pending.unread).toBe(true);
  });

  it("keeps a resolved (accepted) Application with a resolved state, marked read", async () => {
    const items = await getNotifications(hostId);
    const accepted = items.find((item) => item.kind === "request" && item.id === acceptedApplicationId);
    expect(accepted).toBeDefined();
    expect(accepted?.kind === "request" && accepted.resolvedText).toContain("added");
    expect(accepted?.kind === "request" && accepted.unread).toBe(false);
  });

  it("excludes a withdrawn Application entirely", async () => {
    const items = await getNotifications(hostId);
    expect(items.some((item) => item.kind === "request" && item.id === withdrawnApplicationId)).toBe(false);
  });
});
