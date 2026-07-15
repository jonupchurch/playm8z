import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";
import { getAuditLog, groupByDay, type AuditLogEntry } from "./get-audit-log";
import type { SearchAuditLogInput } from "@/lib/validations/audit-log";

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: crypto.randomUUID(),
    actorId: null,
    actorHandle: "System",
    action: "did something",
    category: "system",
    targetType: null,
    targetId: null,
    targetLabel: null,
    reason: null,
    meta: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("groupByDay (pure, research.md #4)", () => {
  it("buckets entries into Today/Yesterday/Earlier, omitting empty buckets", () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const earlier = new Date(today);
    earlier.setDate(today.getDate() - 10);

    const entries = [makeEntry({ createdAt: today }), makeEntry({ createdAt: yesterday }), makeEntry({ createdAt: earlier })];
    const groups = groupByDay(entries);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Earlier"]);
    expect(groups.map((g) => g.entries.length)).toEqual([1, 1, 1]);
  });

  it("omits a bucket entirely when nothing falls into it", () => {
    const groups = groupByDay([makeEntry({ createdAt: new Date() })]);
    expect(groups.length).toBe(1);
    expect(groups[0].label).toBe("Today");
  });

  it("preserves the given (already-sorted) order within a bucket", () => {
    const today = new Date();
    const first = makeEntry({ createdAt: today, action: "first" });
    const second = makeEntry({ createdAt: today, action: "second" });
    const groups = groupByDay([first, second]);
    expect(groups[0].entries.map((e) => e.action)).toEqual(["first", "second"]);
  });
});

describe("getAuditLog (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const actorEmail = `get-audit-log-${runId}@example.com`;
  let actorId: string;
  const entryIds: string[] = [];

  function filters(overrides: Partial<SearchAuditLogInput> = {}): SearchAuditLogInput {
    return { q: runId, actor: "all", category: "all", page: 1, ...overrides };
  }

  beforeAll(async () => {
    const [actor] = await db
      .insert(users)
      .values({ email: actorEmail, handle: `getauditlog${runId}` })
      .returning({ id: users.id });
    actorId = actor.id;

    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const earlier = new Date(today);
    earlier.setDate(today.getDate() - 5);

    // Every action/targetLabel embeds the unique runId so a free-text
    // search on it scopes results to exactly this test's own rows,
    // regardless of whatever else already exists in this shared,
    // append-only, never-wiped audit table (auditEntries is the
    // project's real audit trail -- unlike a content table, it's never
    // an acceptable target for a wholesale test-setup delete).
    const rows = await db
      .insert(auditEntries)
      .values([
        {
          actorId,
          action: `removed a posting ${runId}`,
          category: "moderation",
          targetType: "posting",
          targetLabel: `Spam post ${runId}`,
          reason: "Phishing",
          meta: { rule: "auto-flag" },
          createdAt: today,
        },
        { actorId, action: `published news ${runId}`, category: "content", targetType: "newsPost", targetLabel: `Launch post ${runId}`, createdAt: today },
        { actorId, action: `changed role ${runId}`, category: "access", targetType: "user", targetLabel: `Some user ${runId}`, createdAt: yesterday },
        { actorId: null, action: `auto-hid a posting ${runId}`, category: "system", targetType: "posting", targetLabel: `Hidden post ${runId}`, createdAt: yesterday },
        { actorId, action: `dismissed a report ${runId}`, category: "moderation", targetType: "posting", targetLabel: `Old post ${runId}`, createdAt: earlier },
      ])
      .returning({ id: auditEntries.id });
    entryIds.push(...rows.map((row) => row.id));
  });

  afterAll(async () => {
    await db.delete(auditEntries).where(inArray(auditEntries.id, entryIds));
    await db.delete(users).where(eq(users.id, actorId));
  });

  it("groups the matching entries by day and shows 'System' for a null actorId (FR-002)", async () => {
    const { groups } = await getAuditLog(filters());
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Earlier"]);
    expect(groups.find((g) => g.label === "Today")?.entries.length).toBe(2);
    expect(groups.find((g) => g.label === "Yesterday")?.entries.length).toBe(2);
    expect(groups.find((g) => g.label === "Earlier")?.entries.length).toBe(1);

    const systemEntry = groups.flatMap((g) => g.entries).find((e) => e.action === `auto-hid a posting ${runId}`);
    expect(systemEntry?.actorHandle).toBe("System");
  });

  it("preserves the reason and meta recorded at write time (FR-004)", async () => {
    const { groups } = await getAuditLog(filters());
    const entry = groups.flatMap((g) => g.entries).find((e) => e.action === `removed a posting ${runId}`);
    expect(entry?.reason).toBe("Phishing");
    expect(entry?.meta).toEqual({ rule: "auto-flag" });
  });

  it("shows the real, stored 4-value category -- never a fabricated finer one (research.md #1)", async () => {
    const { groups } = await getAuditLog(filters());
    const all = groups.flatMap((g) => g.entries);
    expect(all.find((e) => e.action === `removed a posting ${runId}`)?.category).toBe("moderation");
    expect(all.find((e) => e.action === `published news ${runId}`)?.category).toBe("content");
    expect(all.find((e) => e.action === `changed role ${runId}`)?.category).toBe("access");
    expect(all.find((e) => e.action === `auto-hid a posting ${runId}`)?.category).toBe("system");
  });

  it("narrows by category, combined with search (FR-003)", async () => {
    const moderation = await getAuditLog(filters({ category: "moderation" }));
    expect(moderation.groups.flatMap((g) => g.entries)).toHaveLength(2);

    const system = await getAuditLog(filters({ category: "system" }));
    expect(system.groups.flatMap((g) => g.entries)).toHaveLength(1);
  });

  it("narrows by actor, including the 'system' sentinel for a null actorId, combined with search (FR-003)", async () => {
    const byActor = await getAuditLog(filters({ actor: actorId }));
    expect(byActor.groups.flatMap((g) => g.entries)).toHaveLength(4);

    const system = await getAuditLog(filters({ actor: "system" }));
    expect(system.groups.flatMap((g) => g.entries)).toHaveLength(1);
    expect(system.groups.flatMap((g) => g.entries)[0].action).toBe(`auto-hid a posting ${runId}`);
  });

  it("matches free-text search against action, targetLabel, and reason", async () => {
    const byReason = await getAuditLog(filters({ q: "Phishing" }));
    expect(byReason.groups.flatMap((g) => g.entries).some((e) => e.action === `removed a posting ${runId}`)).toBe(true);

    const byTarget = await getAuditLog(filters({ q: `Launch post ${runId}` }));
    expect(byTarget.groups.flatMap((g) => g.entries)).toHaveLength(1);
  });

  it("shows an empty result (no groups) for a filter combination matching nothing (FR-006)", async () => {
    const result = await getAuditLog(filters({ q: `${runId}-zzz-no-match` }));
    expect(result.groups).toEqual([]);
  });

  it("lists this test's seeded actor among the distinct real actors", async () => {
    const { actors } = await getAuditLog(filters());
    expect(actors.some((actor) => actor.id === actorId)).toBe(true);
  });

  it("paginates cumulatively (research.md #6): page 1 caps at the page size with hasMore true, page 2 returns everything", async () => {
    const paginationRunId = crypto.randomUUID().slice(0, 8);
    const paginationIds: string[] = [];
    try {
      const values = Array.from({ length: 21 }, (_, i) => ({
        actorId,
        action: `pagination test ${paginationRunId}`,
        category: "system" as const,
        createdAt: new Date(Date.now() - i * 1000),
      }));
      const rows = await db.insert(auditEntries).values(values).returning({ id: auditEntries.id });
      paginationIds.push(...rows.map((row) => row.id));

      const page1 = await getAuditLog({ q: paginationRunId, actor: "all", category: "all", page: 1 });
      expect(page1.groups.flatMap((g) => g.entries)).toHaveLength(20);
      expect(page1.hasMore).toBe(true);

      const page2 = await getAuditLog({ q: paginationRunId, actor: "all", category: "all", page: 2 });
      expect(page2.groups.flatMap((g) => g.entries)).toHaveLength(21);
      expect(page2.hasMore).toBe(false);
    } finally {
      await db.delete(auditEntries).where(inArray(auditEntries.id, paginationIds));
    }
  });
});
