import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { createNotification } from "./create-notification";

describe("createNotification (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const recipientEmail = `notif-recipient-${runId}@example.com`;
  const actorEmail = `notif-actor-${runId}@example.com`;

  let recipientId: string;
  let actorId: string;

  beforeAll(async () => {
    const [recipient] = await db
      .insert(users)
      .values({ email: recipientEmail, handle: `notifrecipient${runId}` })
      .returning({ id: users.id });
    recipientId = recipient.id;

    const [actor] = await db
      .insert(users)
      .values({ email: actorEmail, handle: `notifactor${runId}` })
      .returning({ id: users.id });
    actorId = actor.id;
  });

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, recipientId));
    await db.delete(users).where(eq(users.email, recipientEmail));
    await db.delete(users).where(eq(users.email, actorEmail));
  });

  it("inserts a row with the given fields, defaulting read to false", async () => {
    const { id } = await createNotification({
      userId: recipientId,
      type: "mention",
      actorId,
      text: `mentioned you in "Test thread" ${runId}`,
      targetRef: "/forum/thread/some-id",
    });

    const [row] = await db.select().from(notifications).where(eq(notifications.id, id));
    expect(row).toBeDefined();
    expect(row.userId).toBe(recipientId);
    expect(row.type).toBe("mention");
    expect(row.actorId).toBe(actorId);
    expect(row.read).toBe(false);
    expect(row.targetRef).toBe("/forum/thread/some-id");
  });

  it("allows a null actorId for system-originated notifications", async () => {
    const { id } = await createNotification({
      userId: recipientId,
      type: "news",
      text: `New: something shipped ${runId}`,
      targetRef: "/news/something",
    });

    const [row] = await db.select().from(notifications).where(eq(notifications.id, id));
    expect(row.actorId).toBeNull();
    expect(row.type).toBe("news");
  });
});
