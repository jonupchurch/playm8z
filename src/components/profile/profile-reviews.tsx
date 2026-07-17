import { Avatar } from "@/components/ui/avatar";
import type { PublicProfileReview } from "@/lib/profile/get-public-profile";

// Each reviewer avatar renders through the shared <Avatar>, so a review
// must carry the reviewer's uploaded/Google image alongside the gradient
// colour (034/FR-008). The feeder query (get-public-profile.ts) selects
// `reviewerAvatarImage`/`reviewerImage` next to `reviewerAvatarColor`.
type ReviewWithAvatar = PublicProfileReview & {
  reviewerAvatarImage: string | null;
  reviewerImage: string | null;
};

// FR-001/research.md #6: display-only -- no rating-submission writer
// exists yet (deferred platform-wide, docs/future-work.md), so a fresh
// install always shows the empty state below rather than a blank
// section.
export function ProfileReviews({
  reviews,
  avgRating,
  reviewCount,
}: {
  reviews: ReviewWithAvatar[];
  avgRating: number | null;
  reviewCount: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[10px] tracking-[0.16em] text-pop-text uppercase">Player reviews</div>
        {reviewCount > 0 && (
          <div className="font-mono text-[11px] text-text-muted">
            ★ {avgRating?.toFixed(1)} · {reviewCount}
          </div>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-text-dim">No reviews yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3">
              <Avatar
                avatarImage={review.reviewerAvatarImage}
                googleImage={review.reviewerImage}
                avatarColor={review.reviewerAvatarColor}
                handle={review.reviewerHandle}
                className="h-9 w-9 shrink-0 rounded-[10px] text-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">@{review.reviewerHandle}</span>
                  <span aria-label={`${review.rating} out of 5 stars`} className="text-[11px] text-[#ffb000]">
                    {"★".repeat(review.rating)}
                    <span className="text-border">{"★".repeat(5 - review.rating)}</span>
                  </span>
                  {review.game && <span className="ml-auto font-mono text-[10px] text-text-dim">{review.game}</span>}
                </div>
                {review.text && <p className="text-[13px] leading-relaxed text-text-muted">{review.text}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
