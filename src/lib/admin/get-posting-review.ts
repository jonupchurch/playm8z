import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, users, warnings } from "@/db/schema";
import { computeSeverity, type Severity } from "@/lib/moderation/reason-severity";

export type ReviewReport = { reason: string; reporterHandle: string };

export type PostingReview = {
  id: string;
  game: string;
  title: string;
  blurb: string;
  createdAt: Date;
  autoFlagReason: string | null;
  severity: Severity;
  reports: ReviewReport[];
  authorId: string;
  authorHandle: string;
  authorAvatarColor: string | null;
  authorAvatarImage: string | null;
  authorImage: string | null;
  authorJoinedAt: Date;
  priorWarnings: number;
  totalPosts: number;
};

// FR-006: the drawer's full posting, "why it's here" (auto-flag reason
// and/or each open report with its reporter), and the author's join
// info, prior-warning count, and total-posts count.
export async function getPostingReview(postingId: string): Promise<PostingReview | null> {
  const [posting] = await db
    .select({
      id: postings.id,
      game: postings.game,
      title: postings.title,
      blurb: postings.blurb,
      createdAt: postings.createdAt,
      autoFlagReason: postings.autoFlagReason,
      hostId: postings.hostId,
    })
    .from(postings)
    .where(eq(postings.id, postingId));
  if (!posting) return null;

  const [[author], reportRows, [warningsRow], [postsRow]] = await Promise.all([
    db
      .select({
        id: users.id,
        handle: users.handle,
        avatarColor: users.avatarColor,
        avatarImage: users.avatarImage,
        image: users.image,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, posting.hostId)),
    db
      .select({ reason: reports.reason, reporterHandle: users.handle })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(and(eq(reports.targetType, "posting"), eq(reports.targetId, postingId), eq(reports.status, "open"))),
    db.select({ n: sql<number>`count(*)::int` }).from(warnings).where(eq(warnings.userId, posting.hostId)),
    db.select({ n: sql<number>`count(*)::int` }).from(postings).where(eq(postings.hostId, posting.hostId)),
  ]);

  const reviewReports: ReviewReport[] = reportRows.map((row) => ({
    reason: row.reason ?? "other",
    reporterHandle: row.reporterHandle ?? "player",
  }));

  return {
    id: posting.id,
    game: posting.game,
    title: posting.title,
    blurb: posting.blurb,
    createdAt: posting.createdAt,
    autoFlagReason: posting.autoFlagReason,
    severity: computeSeverity(
      reviewReports.map((r) => r.reason),
      posting.autoFlagReason,
    ),
    reports: reviewReports,
    authorId: author.id,
    authorHandle: author.handle ?? "player",
    authorAvatarColor: author.avatarColor,
    authorAvatarImage: author.avatarImage,
    authorImage: author.image,
    authorJoinedAt: author.createdAt,
    priorWarnings: warningsRow.n,
    totalPosts: postsRow.n,
  };
}
