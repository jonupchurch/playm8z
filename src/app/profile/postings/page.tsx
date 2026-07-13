import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { PostingManagementCard } from "@/components/profile/posting-management-card";

// FR-007: every posting the user has created, with status and
// applicant count.
export default async function MyPostingsPage() {
  const authUser = await requireAuth();

  const myPostings = await db
    .select()
    .from(postings)
    .where(eq(postings.hostId, authUser.id))
    .orderBy(desc(postings.createdAt));

  const applicationRows =
    myPostings.length > 0
      ? await db
          .select({ postingId: applications.postingId, status: applications.status })
          .from(applications)
          .where(
            inArray(
              applications.postingId,
              myPostings.map((posting) => posting.id),
            ),
          )
      : [];

  return (
    <div>
      <h2 className="mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">My postings</h2>
      {myPostings.length === 0 ? (
        <p className="text-sm text-text-muted">You haven&apos;t posted anything yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {myPostings.map((posting) => {
            const ownApplications = applicationRows.filter((row) => row.postingId === posting.id);
            return (
              <PostingManagementCard
                key={posting.id}
                posting={{
                  ...posting,
                  applicantCount: ownApplications.length,
                  hasAccepted: ownApplications.some((row) => row.status === "accepted"),
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
