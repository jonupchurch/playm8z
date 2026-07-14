import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, postings, reports, users } from "@/db/schema";

export type UserDetailPosting = {
  id: string;
  game: string;
  title: string;
  seatsOpen: number;
  seatsTotal: number;
  status: string;
  createdAt: Date;
};

export type UserDetailThread = {
  id: string;
  title: string;
  body: string;
  replyCount: number;
  createdAt: Date;
};

export type UserDetail = {
  id: string;
  handle: string;
  email: string;
  avatarColor: string | null;
  region: string | null;
  createdAt: Date;
  bannedAt: Date | null;
  openReportCount: number;
  postings: UserDetailPosting[];
  forumThreads: UserDetailThread[];
};

// FR-007: the drawer's join date, region, open-report count, and its
// Postings/Forum-posts tabs. Already-removed items are excluded here
// too -- once Removed, an item "no longer appears in the drawer"
// (spec.md's own Acceptance Scenario for US3), not shown with a
// removed badge.
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const [user] = await db
    .select({
      id: users.id,
      handle: users.handle,
      email: users.email,
      avatarColor: users.avatarColor,
      region: users.region,
      createdAt: users.createdAt,
      bannedAt: users.bannedAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return null;

  const [[reportRow], postingRows, threadRows] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(reports)
      .where(and(eq(reports.targetType, "user"), eq(reports.targetId, userId), eq(reports.status, "open"))),
    db
      .select({
        id: postings.id,
        game: postings.game,
        title: postings.title,
        seatsOpen: postings.seatsOpen,
        seatsTotal: postings.seatsTotal,
        status: postings.status,
        createdAt: postings.createdAt,
      })
      .from(postings)
      .where(and(eq(postings.hostId, userId), isNull(postings.removedAt)))
      .orderBy(desc(postings.createdAt)),
    db
      .select({
        id: forumThreads.id,
        title: forumThreads.title,
        body: forumThreads.body,
        replyCount: forumThreads.replyCount,
        createdAt: forumThreads.createdAt,
      })
      .from(forumThreads)
      .where(and(eq(forumThreads.authorId, userId), isNull(forumThreads.removedAt)))
      .orderBy(desc(forumThreads.createdAt)),
  ]);

  return {
    ...user,
    handle: user.handle ?? "player",
    openReportCount: reportRow.n,
    postings: postingRows,
    forumThreads: threadRows,
  };
}
