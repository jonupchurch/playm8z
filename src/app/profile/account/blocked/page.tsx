import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { blocks, reports, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { BlockedUsersClient } from "@/components/blocking/blocked-users-client";

export default async function BlockedUsersPage() {
  const authUser = await requireAuth();

  const rows = await db
    .select({
      blockId: blocks.id,
      userId: users.id,
      handle: users.handle,
      avatarColor: users.avatarColor,
      avatarImage: users.avatarImage,
      image: users.image,
      blockedAt: blocks.createdAt,
    })
    .from(blocks)
    .innerJoin(users, eq(users.id, blocks.blockedId))
    .where(and(eq(blocks.blockerId, authUser.id), isNull(blocks.unblockedAt)))
    .orderBy(desc(blocks.createdAt));

  const reportedRows = await db
    .select({ targetId: reports.targetId })
    .from(reports)
    .where(and(eq(reports.reporterId, authUser.id), eq(reports.targetType, "user")));
  const reportedIds = new Set(reportedRows.map((row) => row.targetId));

  const initialBlocked = rows.map((row) => ({
    blockId: row.blockId,
    handle: row.handle ?? "player",
    avatarColor: row.avatarColor,
    avatarImage: row.avatarImage,
    image: row.image,
    blockedAt: row.blockedAt.toISOString(),
    hasReport: reportedIds.has(row.userId),
  }));

  return (
    <div className="max-w-180">
      <div className="mb-5 font-mono text-[11px] text-text-dim">
        <Link href="/profile/account" className="text-text-muted underline underline-offset-2">
          Account
        </Link>{" "}
        <span>/</span> <span>Blocked users</span>
      </div>
      <BlockedUsersClient initialBlocked={initialBlocked} />
    </div>
  );
}
