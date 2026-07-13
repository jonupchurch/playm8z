import { and, arrayOverlaps, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { forumReplies, forumThreads, likes, threadSubscriptions, users } from "@/db/schema";
import { isHotThread } from "@/lib/forum/search-threads";
import type { ReplySort } from "@/lib/validations/forum-thread";

const RELATED_THREADS_LIMIT = 3;

export type ReplyDetail = {
  id: string;
  authorId: string;
  authorHandle: string;
  authorAvatarColor: string | null;
  body: string;
  quotedReplyId: string | null;
  quotedAuthorHandle: string | null;
  quotedBody: string | null;
  likes: number;
  createdAt: Date;
  isOP: boolean;
  likedByViewer: boolean;
};

export type RelatedThread = {
  id: string;
  title: string;
  categoryId: string;
  replyCount: number;
};

export type ThreadDetail = {
  id: string;
  categoryId: string;
  authorId: string;
  authorHandle: string;
  authorAvatarColor: string | null;
  authorRegion: string | null;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  locked: boolean;
  hot: boolean;
  replyCount: number;
  viewCount: number;
  likes: number;
  createdAt: Date;
  likedByViewer: boolean;
  isSubscribedByViewer: boolean;
  replies: ReplyDetail[];
  relatedThreads: RelatedThread[];
};

function orderForSort(sort: ReplySort) {
  if (sort === "top") return [desc(forumReplies.likes), desc(forumReplies.createdAt)];
  if (sort === "old") return [asc(forumReplies.createdAt)];
  return [desc(forumReplies.createdAt)];
}

// FR-002/FR-003/FR-004: the OP is the thread itself (Forum index
// already owns creating it); replies are this feature's own rows.
// `viewerId`, when provided, drives `likedByViewer` on both the OP and
// each reply so the like control can render its current state.
export async function getThread(threadId: string, sort: ReplySort, viewerId?: string): Promise<ThreadDetail | null> {
  const [thread] = await db
    .select({
      id: forumThreads.id,
      categoryId: forumThreads.categoryId,
      authorId: forumThreads.authorId,
      authorHandle: users.handle,
      authorAvatarColor: users.avatarColor,
      authorRegion: users.region,
      title: forumThreads.title,
      body: forumThreads.body,
      tags: forumThreads.tags,
      pinned: forumThreads.pinned,
      locked: forumThreads.locked,
      replyCount: forumThreads.replyCount,
      viewCount: forumThreads.viewCount,
      likes: forumThreads.likes,
      createdAt: forumThreads.createdAt,
    })
    .from(forumThreads)
    .innerJoin(users, eq(forumThreads.authorId, users.id))
    .where(eq(forumThreads.id, threadId));

  if (!thread) return null;

  const quoted = alias(forumReplies, "quoted");
  const quotedAuthor = alias(users, "quotedAuthor");

  const replyRows = await db
    .select({
      id: forumReplies.id,
      authorId: forumReplies.authorId,
      authorHandle: users.handle,
      authorAvatarColor: users.avatarColor,
      body: forumReplies.body,
      quotedReplyId: forumReplies.quotedReplyId,
      quotedBody: quoted.body,
      quotedAuthorHandle: quotedAuthor.handle,
      likes: forumReplies.likes,
      createdAt: forumReplies.createdAt,
    })
    .from(forumReplies)
    .innerJoin(users, eq(forumReplies.authorId, users.id))
    .leftJoin(quoted, eq(forumReplies.quotedReplyId, quoted.id))
    .leftJoin(quotedAuthor, eq(quoted.authorId, quotedAuthor.id))
    .where(eq(forumReplies.threadId, threadId))
    .orderBy(...orderForSort(sort));

  const likedTargetIds = new Set<string>();
  let isSubscribedByViewer = false;
  if (viewerId) {
    const targetIds = [thread.id, ...replyRows.map((row) => row.id)];
    const likedRows = await db
      .select({ targetId: likes.targetId })
      .from(likes)
      .where(and(eq(likes.userId, viewerId), inArray(likes.targetId, targetIds)));
    likedRows.forEach((row) => likedTargetIds.add(row.targetId));

    const [subscription] = await db
      .select({ id: threadSubscriptions.id })
      .from(threadSubscriptions)
      .where(and(eq(threadSubscriptions.userId, viewerId), eq(threadSubscriptions.threadId, threadId)));
    isSubscribedByViewer = !!subscription;
  }

  const relatedRows = await db
    .select({
      id: forumThreads.id,
      title: forumThreads.title,
      categoryId: forumThreads.categoryId,
      replyCount: forumThreads.replyCount,
    })
    .from(forumThreads)
    .where(
      and(
        ne(forumThreads.id, threadId),
        or(eq(forumThreads.categoryId, thread.categoryId), arrayOverlaps(forumThreads.tags, thread.tags)),
      ),
    )
    .orderBy(desc(forumThreads.createdAt))
    .limit(RELATED_THREADS_LIMIT);

  return {
    ...thread,
    authorHandle: thread.authorHandle ?? "player",
    hot: isHotThread(thread.replyCount, thread.createdAt, thread.pinned),
    likedByViewer: likedTargetIds.has(thread.id),
    isSubscribedByViewer,
    replies: replyRows.map((row) => ({
      ...row,
      authorHandle: row.authorHandle ?? "player",
      isOP: row.authorId === thread.authorId,
      likedByViewer: likedTargetIds.has(row.id),
    })),
    relatedThreads: relatedRows,
  };
}
