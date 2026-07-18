import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";
import { logAuditEntry } from "./log-audit-entry";

describe("logAuditEntry (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `log-audit-${runId}@example.com`;
  let actorId: string;

  afterAll(async () => {
    await db.delete(auditEntries).where(eq(auditEntries.actorId, actorId));
    await db.delete(users).where(eq(users.id, actorId));
  });

  it("creates a row with the expected shape", async () => {
    const [actor] = await db
      .insert(users)
      .values({ email, handle: `logaudit${runId}` })
      .returning({ id: users.id });
    actorId = actor.id;

    await logAuditEntry({
      actorId,
      action: "removed a posting",
      category: "moderation",
      targetType: "posting",
      targetId: crypto.randomUUID(),
      targetLabel: "FREE SKINS CLICK HERE",
      reason: "phishing",
    });

    const [row] = await db.select().from(auditEntries).where(eq(auditEntries.actorId, actorId));
    expect(row.action).toBe("removed a posting");
    expect(row.category).toBe("moderation");
    expect(row.targetLabel).toBe("FREE SKINS CLICK HERE");
    expect(row.reason).toBe("phishing");
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an invalid category before writing anything", async () => {
    await expect(
      logAuditEntry({ action: "bogus", category: "not-a-real-category" as never }),
    ).rejects.toThrow();
  });

  it("swallows an insert failure (best-effort) so an already-committed action isn't reported as failed", async () => {
    // Well-formed input (passes validation) but actorId references no
    // user -> the FK insert fails. Because callers log AFTER their real
    // mutation has committed, logAuditEntry must not rethrow -- it logs
    // and resolves. Pre-fix this rejected and 500'd the caller's action.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        logAuditEntry({ actorId: crypto.randomUUID(), action: "removed a posting", category: "moderation" }),
      ).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("allows a null actorId for system-generated entries", async () => {
    await logAuditEntry({ action: "system sweep completed", category: "system" });

    const [row] = await db
      .select()
      .from(auditEntries)
      .where(eq(auditEntries.action, "system sweep completed"));
    expect(row.actorId).toBeNull();

    await db.delete(auditEntries).where(eq(auditEntries.id, row.id));
  });
});
