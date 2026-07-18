import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { blocks, notifications, users } from "@/db/schema";

// The emitters transitively import search-contacts.ts -> require-auth -> @/auth
// (NextAuth), which can't load `next/server` in the test env. The emitters never
// call auth themselves, so a stub is enough to break that import chain (same
// pattern every action test uses).
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { notifyForumReply, notifyMentions, notifyRequestResolved } = await import("./notify-events");

// Integration test against the real DB. The emitters only read `users` (mention
// resolution) and `blocks` (suppression) and write `notifications`, so we seed
// just users + blocks and pass thread/posting identifiers as plain strings.
const runId = crypto.randomUUID().slice(0, 8);

let authorId: string;
let replierId: string;
let mentionedId: string;
let blockedId: string;
let hostId: string;
let applicantId: string;

const ids: string[] = [];

async function seedUser(handle: string): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({ email: `${handle}@example.com`, handle, emailVerified: new Date() })
    .returning({ id: users.id });
  ids.push(row.id);
  return row.id;
}

function notifsFor(userId: string) {
  return db.select().from(notifications).where(eq(notifications.userId, userId));
}

beforeAll(async () => {
  authorId = await seedUser(`nauthor${runId}`);
  replierId = await seedUser(`nreplier${runId}`);
  mentionedId = await seedUser(`nmention${runId}`);
  blockedId = await seedUser(`nblocked${runId}`);
  hostId = await seedUser(`nhost${runId}`);
  applicantId = await seedUser(`napplicant${runId}`);

  // An active block between the replier and the blocked user, both directions covered.
  await db.insert(blocks).values({ blockerId: blockedId, blockedId: replierId });
});

afterAll(async () => {
  await db.delete(notifications).where(inArray(notifications.userId, ids));
  await db.delete(blocks).where(inArray(blocks.blockerId, ids));
  await db.delete(users).where(inArray(users.id, ids));
});

describe("notifyForumReply", () => {
  it("notifies the thread author with a reply notification", async () => {
    await notifyForumReply({ threadId: "t1", threadTitle: "Best co-op games", threadAuthorId: authorId, replierId });
    const rows = await notifsFor(authorId);
    const reply = rows.find((r) => r.type === "reply");
    expect(reply).toBeDefined();
    expect(reply?.actorId).toBe(replierId);
    expect(reply?.targetRef).toBe("/forum/thread/t1");
    expect(reply?.read).toBe(false);
    expect(reply?.text).toContain("Best co-op games");
  });

  it("creates nothing when the replier is the author", async () => {
    await notifyForumReply({ threadId: "t2", threadTitle: "Self", threadAuthorId: authorId, replierId: authorId });
    const rows = await notifsFor(authorId);
    expect(rows.filter((r) => r.targetRef === "/forum/thread/t2")).toHaveLength(0);
  });

  it("creates nothing across an active block", async () => {
    // blockedId blocked replierId; a reply by replierId to blockedId's thread is suppressed.
    await notifyForumReply({ threadId: "t3", threadTitle: "Blocked", threadAuthorId: blockedId, replierId });
    const rows = await notifsFor(blockedId);
    expect(rows).toHaveLength(0);
  });
});

describe("notifyMentions", () => {
  it("notifies each distinct existing mentioned user, ignoring unknown and excluded", async () => {
    await notifyMentions({
      actorId: replierId,
      threadId: "t10",
      threadTitle: "Raid night",
      body: `hey @nmention${runId} and @nmention${runId} again, also @ghost${runId} and @nauthor${runId}`,
      excludeUserIds: [replierId, authorId], // author excluded (would get the reply instead)
    });
    const mentionRows = (await notifsFor(mentionedId)).filter((r) => r.type === "mention");
    expect(mentionRows).toHaveLength(1); // deduped, resolved, one row
    expect(mentionRows[0].actorId).toBe(replierId);
    expect(mentionRows[0].targetRef).toBe("/forum/thread/t10");

    // unknown handle and excluded author produced nothing
    const authorMentions = (await notifsFor(authorId)).filter((r) => r.targetRef === "/forum/thread/t10");
    expect(authorMentions).toHaveLength(0);
  });

  it("skips a mentioned user in an active block with the actor", async () => {
    await notifyMentions({
      actorId: replierId,
      threadId: "t11",
      threadTitle: "Blocked mention",
      body: `pinging @nblocked${runId}`,
      excludeUserIds: [replierId],
    });
    const rows = (await notifsFor(blockedId)).filter((r) => r.targetRef === "/forum/thread/t11");
    expect(rows).toHaveLength(0);
  });

  it("does nothing when the body has no mentions", async () => {
    const before = (await notifsFor(mentionedId)).length;
    await notifyMentions({ actorId: replierId, threadId: "t12", threadTitle: "None", body: "no pings here", excludeUserIds: [replierId] });
    const after = (await notifsFor(mentionedId)).length;
    expect(after).toBe(before);
  });
});

describe("notifyRequestResolved", () => {
  it("notifies the applicant of an acceptance", async () => {
    await notifyRequestResolved({ kind: "accepted", applicantId, hostId, postingId: "p1", game: "Valorant", title: "Ranked grind" });
    const rows = (await notifsFor(applicantId)).filter((r) => r.type === "accepted");
    expect(rows).toHaveLength(1);
    expect(rows[0].actorId).toBe(hostId);
    expect(rows[0].targetRef).toBe("/listing/p1");
    expect(rows[0].text).toContain("Valorant · Ranked grind");
  });

  it("notifies the applicant of a decline with the declined type", async () => {
    await notifyRequestResolved({ kind: "declined", applicantId, hostId, postingId: "p2", game: "CS2", title: "Need 2" });
    const rows = (await notifsFor(applicantId)).filter((r) => r.type === "declined");
    expect(rows).toHaveLength(1);
    expect(rows[0].targetRef).toBe("/listing/p2");
  });

  it("creates nothing across an active block between host and applicant", async () => {
    await db.insert(blocks).values({ blockerId: applicantId, blockedId: hostId });
    await notifyRequestResolved({ kind: "accepted", applicantId, hostId, postingId: "p3", game: "Dota 2", title: "5-stack" });
    const rows = (await notifsFor(applicantId)).filter((r) => r.targetRef === "/listing/p3");
    expect(rows).toHaveLength(0);
    await db.delete(blocks).where(and(eq(blocks.blockerId, applicantId), eq(blocks.blockedId, hostId)));
  });
});

describe("best-effort — a failing notification write never throws (FR-010)", () => {
  // A recipient id that isn't a real users row triggers a real FK violation
  // inside createNotification. The emitter must swallow it and resolve.
  const ghostId = "00000000-0000-0000-0000-000000000000";

  it("notifyForumReply swallows a DB failure and logs", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      notifyForumReply({ threadId: "tE", threadTitle: "Boom", threadAuthorId: ghostId, replierId }),
    ).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("notifyRequestResolved swallows a DB failure and logs", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      notifyRequestResolved({ kind: "accepted", applicantId: ghostId, hostId, postingId: "pE", game: "G", title: "T" }),
    ).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
