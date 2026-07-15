import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, users } from "@/db/schema";
import { classifyForumTarget } from "./classify-forum-target";

const runId = crypto.randomUUID().slice(0, 8);
const authorEmail = `classify-forum-author-${runId}@example.com`;
let authorId: string;
let threadId: string;
let replyId: string;

afterAll(async () => {
  await db.delete(forumReplies).where(eq(forumReplies.id, replyId));
  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  await db.delete(users).where(eq(users.id, authorId));
});

describe("classifyForumTarget", () => {
  it("classifies a thread id, a reply id, and returns null for neither", async () => {
    const [author] = await db.insert(users).values({ email: authorEmail, handle: `classifyforum${runId}` }).returning({ id: users.id });
    authorId = author.id;

    const [thread] = await db
      .insert(forumThreads)
      .values({ categoryId: "general", authorId, title: "Test thread", body: "body" })
      .returning({ id: forumThreads.id });
    threadId = thread.id;

    const [reply] = await db.insert(forumReplies).values({ threadId, authorId, body: "reply body" }).returning({ id: forumReplies.id });
    replyId = reply.id;

    await expect(classifyForumTarget(threadId)).resolves.toBe("forumThread");
    await expect(classifyForumTarget(replyId)).resolves.toBe("forumReply");
    await expect(classifyForumTarget(crypto.randomUUID())).resolves.toBeNull();
  });
});
