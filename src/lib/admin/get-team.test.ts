import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getTeam } from "./get-team";

describe("getTeam (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const emails = {
    plain: `team-plain-${runId}@example.com`,
    support: `team-support-${runId}@example.com`,
    viewer: `team-viewer-${runId}@example.com`,
    moderator: `team-moderator-${runId}@example.com`,
    admin: `team-admin-${runId}@example.com`,
  };

  afterAll(async () => {
    await db.delete(users).where(inArray(users.email, Object.values(emails)));
  });

  it("includes every role >= support, and never a plain user", async () => {
    await db.insert(users).values([
      { email: emails.plain, handle: `teamplain${runId}` },
      { email: emails.support, handle: `teamsupport${runId}`, role: "support" },
      { email: emails.viewer, handle: `teamviewer${runId}`, role: "viewer" },
      { email: emails.moderator, handle: `teammoderator${runId}`, role: "moderator" },
      { email: emails.admin, handle: `teamadmin${runId}`, role: "admin" },
    ]);

    const team = await getTeam();
    const handles = team.map((member) => member.handle);

    expect(handles).not.toContain(`teamplain${runId}`);
    expect(handles).toContain(`teamsupport${runId}`);
    expect(handles).toContain(`teamviewer${runId}`);
    expect(handles).toContain(`teammoderator${runId}`);
    expect(handles).toContain(`teamadmin${runId}`);

    const adminMember = team.find((member) => member.handle === `teamadmin${runId}`);
    expect(adminMember?.role).toBe("admin");
    expect(adminMember?.email).toBe(emails.admin);
  });
});
