import { afterAll, afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { invalidateSettingsCache } from "@/lib/settings/get-settings";
import { POST } from "./route";

async function setOpenSignups(value: boolean) {
  const [row] = await db.select().from(settings).limit(1);
  if (!row) {
    await db.insert(settings).values({ openSignups: value });
  } else {
    await db.update(settings).set({ openSignups: value }).where(eq(settings.id, row.id));
  }
  invalidateSettingsCache();
}

async function setDiscoverableByDefault(value: boolean) {
  const [row] = await db.select().from(settings).limit(1);
  if (!row) {
    await db.insert(settings).values({ discoverableByDefault: value });
  } else {
    await db.update(settings).set({ discoverableByDefault: value }).where(eq(settings.id, row.id));
  }
  invalidateSettingsCache();
}

// Real Postgres (local dev / CI's ephemeral container), matching this
// project's convention for integration tests with real risk of silent
// breakage (plan.md Constitution Check, Principle V).
const runId = crypto.randomUUID().slice(0, 8);
const testEmails: string[] = [];

function request(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  for (const email of testEmails) {
    await db.delete(users).where(eq(users.email, email));
  }
});

afterEach(async () => {
  await setOpenSignups(true);
  await setDiscoverableByDefault(true);
});

describe("POST /api/auth/register", () => {
  it("creates an account on valid input", async () => {
    const email = `register-${runId}-ok@example.com`;
    testEmails.push(email);

    const res = await POST(
      request({ handle: `okuser${runId}`, email, password: "correcthorse" }),
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.email).toBe(email);

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row?.handle).toBe(`okuser${runId}`);
    expect(row?.passwordHash).toBeTruthy();
    expect(row?.emailVerified).toBeNull();
  });

  it("rejects a malformed email, password, or handle with 400", async () => {
    const res = await POST(
      request({ handle: "1bad", email: "not-an-email", password: "short" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email with 409", async () => {
    const email = `register-${runId}-dupe-email@example.com`;
    testEmails.push(email);
    await POST(request({ handle: `dupemail${runId}`, email, password: "correcthorse" }));

    const res = await POST(
      request({ handle: `differenthandle${runId}`, email, password: "correcthorse" }),
    );
    expect(res.status).toBe(409);
  });

  it("rejects a duplicate handle with 409", async () => {
    const handle = `dupehandle${runId}`;
    const firstEmail = `register-${runId}-dupe-handle-a@example.com`;
    const secondEmail = `register-${runId}-dupe-handle-b@example.com`;
    testEmails.push(firstEmail, secondEmail);

    await POST(request({ handle, email: firstEmail, password: "correcthorse" }));
    const res = await POST(request({ handle, email: secondEmail, password: "correcthorse" }));
    expect(res.status).toBe(409);
  });

  // Admin Settings (024)/FR-009.
  it("rejects a new sign-up with 403 when Open Signups is off, and creates nothing", async () => {
    await setOpenSignups(false);
    const email = `register-${runId}-closed@example.com`;

    const res = await POST(request({ handle: `closedsignup${runId}`, email, password: "correcthorse" }));
    expect(res.status).toBe(403);

    const rows = await db.select().from(users).where(eq(users.email, email));
    expect(rows).toHaveLength(0);
  });

  // Admin Settings (024)/FR-011.
  it("initializes privacyDiscoverable from the platform's discoverableByDefault setting", async () => {
    await setDiscoverableByDefault(false);
    const email = `register-${runId}-discoverable@example.com`;
    testEmails.push(email);

    await POST(request({ handle: `discdefault${runId}`, email, password: "correcthorse" }));

    const [row] = await db.select({ privacyDiscoverable: users.privacyDiscoverable }).from(users).where(eq(users.email, email));
    expect(row.privacyDiscoverable).toBe(false);
  });
});
