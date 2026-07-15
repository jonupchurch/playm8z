import { notFound } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { applications, follows, postings, users } from "@/db/schema";
import { getPublicProfileByHandle } from "@/lib/profile/get-public-profile";
import { getInCommon, type InCommon } from "@/lib/profile/get-in-common";
import { PLATFORMS, REGIONS } from "@/lib/validations/onboarding";
import { ProfileHeader, type EligiblePosting } from "@/components/profile/profile-header";
import { ProfileGames } from "@/components/profile/profile-games";
import { ProfileOpenParties, type ViewerApplicationStatus } from "@/components/profile/profile-open-parties";
import { ProfileReviews } from "@/components/profile/profile-reviews";
import { ProfileInCommon } from "@/components/profile/profile-in-common";

// FR-001/FR-002: public -- no login required to view. `deactivatedAt`
// hides a profile from every OTHER visitor (schema.ts's own established
// comment on this column, from Profile+Account settings/007's FR-013),
// same not-found response as a genuinely nonexistent handle; the
// owner's own view of their own deactivated profile is unaffected.
// FR-008: mutual connections/eligible-invite-postings only computed for
// an authenticated, non-self viewer -- never for a logged-out or self
// view.
export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  const profile = await getPublicProfileByHandle(handle);
  if (!profile) {
    notFound();
  }

  const session = await auth();
  let viewerId: string | null = null;
  if (session?.user?.email) {
    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.email, session.user.email));
    viewerId = viewer?.id ?? null;
  }

  const isOwnProfile = viewerId === profile.id;
  if (profile.deactivatedAt && !isOwnProfile) {
    notFound();
  }

  const isLoggedIn = viewerId !== null;

  let isFollowing = false;
  let eligiblePostings: EligiblePosting[] = [];
  let inCommon: InCommon = { mutualFollows: [], sharedGames: [] };

  if (viewerId && !isOwnProfile) {
    const [followRow, hostedOpenPostings, computedInCommon] = await Promise.all([
      db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, viewerId), eq(follows.followeeId, profile.id))),
      db
        .select({ id: postings.id, game: postings.game, title: postings.title })
        .from(postings)
        .where(and(eq(postings.hostId, viewerId), eq(postings.status, "open"), isNull(postings.removedAt))),
      getInCommon(viewerId, profile.id),
    ]);
    isFollowing = followRow.length > 0;
    eligiblePostings = hostedOpenPostings;
    inCommon = computedInCommon;
  }

  let viewerStatuses: Record<string, ViewerApplicationStatus> = {};
  if (viewerId && !isOwnProfile && profile.openPostings.length > 0) {
    const openPostingIds = profile.openPostings.map((posting) => posting.id);
    const viewerApplications = await db
      .select({ postingId: applications.postingId, status: applications.status })
      .from(applications)
      .where(
        and(
          eq(applications.applicantId, viewerId),
          inArray(applications.postingId, openPostingIds),
          inArray(applications.status, ["pending", "accepted"]),
        ),
      );
    viewerStatuses = Object.fromEntries(
      viewerApplications.map((application) => [application.postingId, application.status as ViewerApplicationStatus]),
    );
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <ProfileHeader
        profileOwnerId={profile.id}
        handle={profile.handle}
        bio={profile.bio}
        avatarColor={profile.avatarColor}
        createdAt={profile.createdAt}
        stats={profile.stats}
        isOwnProfile={isOwnProfile}
        isLoggedIn={isLoggedIn}
        initialFollowing={isFollowing}
        eligiblePostings={eligiblePostings}
      />

      <div className="mx-auto grid max-w-250 grid-cols-1 gap-6 px-8 py-7 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <ProfileGames handle={profile.handle} games={profile.games} />
          <ProfileOpenParties
            postings={profile.openPostings}
            viewerStatuses={viewerStatuses}
            isLoggedIn={isLoggedIn}
            isOwnProfile={isOwnProfile}
          />
          <ProfileReviews reviews={profile.reviews} avgRating={profile.stats.avgRating} reviewCount={profile.stats.reviewCount} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface-2 p-5">
            <div className="mb-4 font-mono text-[10px] tracking-[0.14em] text-pop-text uppercase">Public info</div>
            <div className="flex flex-col gap-3.5">
              {(isOwnProfile || profile.showRegion) && (
                <div>
                  <div className="mb-0.75 font-mono text-[10px] text-text-dim">REGION</div>
                  <div className="text-sm font-semibold text-text">
                    {REGIONS.find((region) => region.id === profile.region)?.label ?? "—"}
                  </div>
                </div>
              )}
              {(isOwnProfile || profile.showAgeGroup) && (
                <div>
                  <div className="mb-0.75 font-mono text-[10px] text-text-dim">AGE GROUP</div>
                  <div className="text-sm font-semibold text-text">{profile.ageGroup ? `${profile.ageGroup}+` : "—"}</div>
                </div>
              )}
              <div>
                <div className="mb-1.5 font-mono text-[10px] text-text-dim">PLATFORMS</div>
                {profile.platforms.length === 0 ? (
                  <div className="text-sm text-text-dim">—</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.platforms.map((platform) => (
                      <span key={platform} className="rounded-full border border-border bg-surface px-2.5 py-0.75 font-mono text-[11px] text-text-muted">
                        {PLATFORMS.find((p) => p.id === platform)?.label ?? platform}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {viewerId && !isOwnProfile && <ProfileInCommon mutualFollows={inCommon.mutualFollows} sharedGames={inCommon.sharedGames} />}

          <div className="text-center font-mono text-[10px] leading-relaxed text-text-dim">
            Only shows what @{profile.handle} has made public.
          </div>
        </div>
      </div>
    </main>
  );
}
