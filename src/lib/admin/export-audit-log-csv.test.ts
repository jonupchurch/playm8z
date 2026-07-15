import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";
import { exportAuditLogCsv } from "./export-audit-log-csv";

describe("exportAuditLogCsv (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const actorEmail = `export-audit-log-${runId}@example.com`;
  let actorId: string;
  const entryIds: string[] = [];

  beforeAll(async () => {
    const [actor] = await db
      .insert(users)
      .values({ email: actorEmail, handle: `exportauditlog${runId}` })
      .returning({ id: users.id });
    actorId = actor.id;

    const rows = await db
      .insert(auditEntries)
      .values([
        {
          actorId,
          action: `removed a posting ${runId}`,
          category: "moderation",
          targetType: "posting",
          targetLabel: `Spam, "post" ${runId}`,
          reason: "Phishing, repeated",
          meta: { rule: "auto-flag" },
        },
        { actorId, action: `published news ${runId}`, category: "content", targetType: "newsPost", targetLabel: `Launch post ${runId}` },
        { actorId: null, action: `auto-hid a posting ${runId}`, category: "system", targetType: "posting", targetLabel: `Hidden post ${runId}` },
      ])
      .returning({ id: auditEntries.id });
    entryIds.push(...rows.map((row) => row.id));
  });

  afterAll(async () => {
    await db.delete(auditEntries).where(inArray(auditEntries.id, entryIds));
    await db.delete(users).where(eq(users.id, actorId));
  });

  it("produces one header row plus one row per matching entry, escaping commas/quotes and showing System for a null actor", async () => {
    const csv = await exportAuditLogCsv({ q: runId, actor: "all", category: "all" });
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("createdAt,actor,action,category,targetType,targetLabel,reason,meta");
    expect(lines.length).toBe(4); // header + 3 rows

    expect(csv).toContain(`"Spam, ""post"" ${runId}"`);
    expect(csv).toContain(`"Phishing, repeated"`);
    expect(csv).toContain("System");
  });

  it("mirrors the exact same filter as get-audit-log.ts -- narrowing by category excludes non-matching rows (FR-005/research.md #5)", async () => {
    const csv = await exportAuditLogCsv({ q: runId, actor: "all", category: "content" });
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(2); // header + 1 matching row
    expect(csv).toContain(`published news ${runId}`);
    expect(csv).not.toContain(`removed a posting ${runId}`);
  });
});
