import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hasActiveBlockBetween } from "@/lib/inbox/search-contacts";
import { createNotification } from "./create-notification";
import { extractMentionHandles } from "./parse-mentions";

// Best-effort notification emitters — the callers this feature (040) finally
// wires createNotification() into. EVERY exported function here is a side
// effect that MUST NOT break its primary action: each wraps its body in
// try/catch, logs on failure, and returns void, so a caller can `await` it
// after the real write without any risk of throwing or rolling back. See
// docs/adr/0013 and specs/040-notification-wiring/research.md #6.

// Forum reply -> the thread's author. No-op when the replier IS the author
// (self-reply) or a block relationship exists between them.
export async function notifyForumReply(args: {
  threadId: string;
  threadTitle: string;
  threadAuthorId: string;
  replierId: string;
}): Promise<void> {
  try {
    if (args.replierId === args.threadAuthorId) return;
    if (await hasActiveBlockBetween(args.replierId, args.threadAuthorId)) return;
    await createNotification({
      userId: args.threadAuthorId,
      type: "reply",
      actorId: args.replierId,
      text: `replied to your thread “${args.threadTitle}”`,
      targetRef: `/forum/thread/${args.threadId}`,
    });
  } catch (err) {
    console.error("notifyForumReply failed", err);
  }
}

// @mentions in a forum thread/reply body -> each distinct existing, non-excluded,
// non-blocked mentioned player. `excludeUserIds` always carries the actor and,
// for a reply, the thread author (who gets the `reply` notification instead, so
// a single event never double-notifies — FR-005).
export async function notifyMentions(args: {
  actorId: string;
  threadId: string;
  threadTitle: string;
  body: string;
  excludeUserIds: string[];
}): Promise<void> {
  try {
    const handles = extractMentionHandles(args.body);
    if (handles.length === 0) return;

    const mentioned = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(sql`lower(${users.handle})`, handles));

    const excluded = new Set(args.excludeUserIds);
    for (const user of mentioned) {
      if (excluded.has(user.id)) continue;
      excluded.add(user.id); // guard against any resolution returning a dup id
      if (await hasActiveBlockBetween(args.actorId, user.id)) continue;
      await createNotification({
        userId: user.id,
        type: "mention",
        actorId: args.actorId,
        text: `mentioned you in “${args.threadTitle}”`,
        targetRef: `/forum/thread/${args.threadId}`,
      });
    }
  } catch (err) {
    console.error("notifyMentions failed", err);
  }
}

// An applicant-initiated join request being resolved -> the applicant. Actor is
// the host. Caller MUST only invoke this for applicant-initiated requests
// (`initiatedBy !== "host"`); the host-initiated-invite flow is covered by the
// host's live request synthesis instead (research.md #3). No-op across a block.
export async function notifyRequestResolved(args: {
  kind: "accepted" | "declined";
  applicantId: string;
  hostId: string;
  postingId: string;
  game: string;
  title: string;
}): Promise<void> {
  try {
    if (await hasActiveBlockBetween(args.hostId, args.applicantId)) return;
    const verb = args.kind === "accepted" ? "accepted" : "declined";
    await createNotification({
      userId: args.applicantId,
      type: args.kind,
      actorId: args.hostId,
      text: `${verb} your request to join ${args.game} · ${args.title}`,
      targetRef: `/listing/${args.postingId}`,
    });
  } catch (err) {
    console.error("notifyRequestResolved failed", err);
  }
}
