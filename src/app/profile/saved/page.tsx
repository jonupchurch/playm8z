import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, savedListings, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import { UnsaveButton } from "@/components/profile/unsave-button";

const REGION_LABELS: Record<string, string> = {
  "na-east": "NA-East",
  "na-west": "NA-West",
  "eu-west": "EU-West",
  "eu-east": "EU-East",
  asia: "Asia",
  oceania: "Oceania",
};

// FR-010/FR-011: saved listings with enough detail to recognize each
// and a link to the full listing; an empty state with a path to
// Browse when none are saved.
export default async function SavedListingsPage() {
  const authUser = await requireAuth();

  const saved = await db
    .select({
      postingId: postings.id,
      game: postings.game,
      title: postings.title,
      region: postings.region,
      hostHandle: users.handle,
      hostAvatarColor: users.avatarColor,
      savedAt: savedListings.createdAt,
    })
    .from(savedListings)
    .innerJoin(postings, eq(savedListings.postingId, postings.id))
    .innerJoin(users, eq(postings.hostId, users.id))
    .where(eq(savedListings.userId, authUser.id))
    .orderBy(desc(savedListings.createdAt));

  return (
    <div>
      <h2 className="mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Saved</h2>
      {saved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-2 text-lg font-bold text-text">No saved postings yet.</div>
          <p className="mb-4.5 text-sm text-text-muted">Tap the heart on any listing to save it here.</p>
          <Link
            href="/browse"
            className="inline-block rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5.5 py-2.5 text-sm font-bold text-on-accent"
          >
            Browse games
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((listing) => {
            const avatarGradient =
              AVATAR_COLORS.find((swatch) => swatch.id === listing.hostAvatarColor)?.gradient ??
              AVATAR_COLORS[0].gradient;
            return (
              <div
                key={listing.postingId}
                className="flex flex-col rounded-2xl border border-border bg-surface p-4.5"
              >
                <div className="mb-3.5 flex items-center gap-2.5">
                  <div
                    style={{ background: avatarGradient }}
                    className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-on-accent"
                  >
                    {(listing.hostHandle?.trim()[0] || "P").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-text">@{listing.hostHandle}</div>
                    <div className="font-mono text-[10px] text-text-muted">
                      {REGION_LABELS[listing.region] ?? listing.region}
                    </div>
                  </div>
                  <UnsaveButton postingId={listing.postingId} />
                </div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-accent-2">
                  {listing.game}
                </div>
                <h3 className="mb-3.5 flex-1 text-[15px] leading-snug font-bold text-text">{listing.title}</h3>
                <Link
                  href={`/listing/${listing.postingId}`}
                  className="block w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-2.5 text-center text-sm font-bold text-on-accent"
                >
                  View listing
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
