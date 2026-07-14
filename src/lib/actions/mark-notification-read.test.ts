import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { markNotificationRead } = await import("./mark-notification-read");
const { markAllRead } = await import("./mark-all-read");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

describe("markNotificationRead / markAllRead (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const ownerEmail = `mark-owner-${runId}@example.com`;
  const outsiderEmail = `mark-outsider-${runId}@example.com`;

  let ownerId: string;

  beforeAll(async () => {
    const [owner] = await db
      .insert(users)
      .values({ email: ownerEmail, handle: `markowner${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    ownerId = owner.id;

    await db.insert(users).values({ email: outsiderEmail, handle: `markoutsider${runId}`, emailVerified: new Date() });
  });

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, ownerId));
    await db.delete(users).where(eq(users.email, ownerEmail));
    await db.delete(users).where(eq(users.email, outsiderEmail));
  });

  it("marks the owner's own notification read", async () => {
    const [row] = await db
      .insert(notifications)
      .values({ userId: ownerId, type: "system", text: "hi", targetRef: "/x" })
      .returning({ id: notifications.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(ownerEmail));
    const result = await markNotificationRead({ notificationId: row.id });
    expect(result).toEqual({ success: true });

    const [updated] = await db.select().from(notifications).where(eq(notifications.id, row.id));
    expect(updated.read).toBe(true);
  });

  it("doesn't let another user mark someone else's notification read", async () => {
    const [row] = await db
      .insert(notifications)
      .values({ userId: ownerId, type: "system", text: "hi", targetRef: "/x" })
      .returning({ id: notifications.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(outsiderEmail));
    const result = await markNotificationRead({ notificationId: row.id });
    expect(result).toEqual({ success: true });

    const [unchanged] = await db.select().from(notifications).where(eq(notifications.id, row.id));
    expect(unchanged.read).toBe(false);
  });

  it("mark-all-read clears every unread row for the acting user only", async () => {
    const [ownRow] = await db
      .insert(notifications)
      .values({ userId: ownerId, type: "reply", text: "replied", targetRef: "/x" })
      .returning({ id: notifications.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(ownerEmail));
    const result = await markAllRead();
    expect(result).toEqual({ success: true });

    const [updated] = await db.select().from(notifications).where(eq(notifications.id, ownRow.id));
    expect(updated.read).toBe(true);
  });
});
