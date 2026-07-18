import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts, postings, savedListings, savedNewsPosts, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { Avatar } from "@/components/ui/avatar";
import { newsCategoryColor } from "@/lib/validations/news";
import { newsCoverStyle } from "@/lib/news/cover-style";
import { UnsaveButton } from "@/components/profile/unsave-button";
import { UnsaveNewsPostButton } from "@/components/profile/unsave-news-post-button";

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
// Browse when none are saved. News Article detail (023): a second,
// separate "Saved articles" section reading from `savedNewsPosts` --
// deliberately its own table, not a generalization of `savedListings`
// (research.md #4) -- without this, "Save" on an article would be a
// write with no visible effect (research.md #5).
export default async function SavedListingsPage() {
  const authUser = await requireAuth();

  const [saved, savedArticles] = await Promise.all([
    db
      .select({
        postingId: postings.id,
        game: postings.game,
        title: postings.title,
        region: postings.region,
        hostHandle: users.handle,
        hostAvatarColor: users.avatarColor,
        hostAvatarImage: users.avatarImage,
        hostImage: users.image,
        savedAt: savedListings.createdAt,
      })
      .from(savedListings)
      .innerJoin(postings, eq(savedListings.postingId, postings.id))
      .innerJoin(users, eq(postings.hostId, users.id))
      .where(eq(savedListings.userId, authUser.id))
      .orderBy(desc(savedListings.createdAt)),
    db
      .select({
        newsPostId: newsPosts.id,
        slug: newsPosts.slug,
        title: newsPosts.title,
        excerpt: newsPosts.excerpt,
        category: newsPosts.category,
        cover: newsPosts.cover,
        savedAt: savedNewsPosts.createdAt,
      })
      .from(savedNewsPosts)
      .innerJoin(newsPosts, eq(savedNewsPosts.newsPostId, newsPosts.id))
      .where(eq(savedNewsPosts.userId, authUser.id))
      .orderBy(desc(savedNewsPosts.createdAt)),
  ]);

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
            return (
              <div
                key={listing.postingId}
                className="flex flex-col rounded-2xl border border-border bg-surface p-4.5"
              >
                <div className="mb-3.5 flex items-center gap-2.5">
                  <Avatar
                    avatarImage={listing.hostAvatarImage}
                    googleImage={listing.hostImage}
                    avatarColor={listing.hostAvatarColor}
                    handle={listing.hostHandle}
                    className="h-9.5 w-9.5 shrink-0 rounded-lg text-sm"
                  />
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

      <h2 className="mt-9 mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Saved articles</h2>
      {savedArticles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-2 text-lg font-bold text-text">No saved articles yet.</div>
          <p className="mb-4.5 text-sm text-text-muted">Tap Save on any article to find it here.</p>
          <Link
            href="/news"
            className="inline-block rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5.5 py-2.5 text-sm font-bold text-on-accent"
          >
            Browse news
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {savedArticles.map((article) => {
            const color = newsCategoryColor(article.category);
            return (
              <div key={article.newsPostId} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
                <div
                  className="h-24"
                  style={newsCoverStyle(article.cover)}
                />
                <div className="flex flex-1 flex-col p-4.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      style={{ color, borderColor: `${color}60`, background: `${color}24` }}
                      className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold"
                    >
                      {article.category}
                    </span>
                    <UnsaveNewsPostButton newsPostId={article.newsPostId} />
                  </div>
                  <h3 className="mb-3.5 flex-1 text-[15px] leading-snug font-bold text-text">{article.title}</h3>
                  <Link
                    href={`/news/${article.slug}`}
                    className="block w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-2.5 text-center text-sm font-bold text-on-accent"
                  >
                    Read article
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
