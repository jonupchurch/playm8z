import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import { relativeAge } from "@/components/listings/listing-card";
import { LikeButton } from "@/components/forum/like-button";
import { ReportButton } from "@/components/forum/report-button";
import type { ThreadDetail } from "@/lib/forum/get-thread";

const REGION_LABELS: Record<string, string> = {
  "na-east": "NA-East",
  "na-west": "NA-West",
  "eu-west": "EU-West",
  "eu-east": "EU-East",
  asia: "Asia",
  oceania: "Oceania",
};

// FR-002: renders distinctly from replies via the OP badge. Author
// identity is always @handle, never display name (ADR 0006).
export function OriginalPost({ thread, isLoggedIn }: { thread: ThreadDetail; isLoggedIn: boolean }) {
  const avatarGradient =
    AVATAR_COLORS.find((swatch) => swatch.id === thread.authorAvatarColor)?.gradient ?? AVATAR_COLORS[0].gradient;
  const initial = (thread.authorHandle.trim()[0] || "P").toUpperCase();

  return (
    <div className="rounded-2xl border border-accent-2/25 bg-surface p-5">
      <div className="mb-3.5 flex items-center gap-2.5">
        <div
          style={{ background: avatarGradient }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-on-accent"
        >
          {initial}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-text">@{thread.authorHandle}</span>
            <span className="rounded-md bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-1.5 py-0.5 font-mono text-[9px] font-bold text-on-accent">
              OP
            </span>
          </div>
          <div className="font-mono text-[10px] text-text-dim">
            {relativeAge(thread.createdAt)}
            {thread.authorRegion && ` · ${REGION_LABELS[thread.authorRegion] ?? thread.authorRegion}`}
          </div>
        </div>
      </div>

      <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-text-muted">{thread.body}</div>

      {thread.tags.length > 0 && (
        <div className="my-4 flex flex-wrap gap-1.5">
          {thread.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-3.5">
        <LikeButton
          targetType="thread"
          targetId={thread.id}
          initialLikes={thread.likes}
          initialLiked={thread.likedByViewer}
          isLoggedIn={isLoggedIn}
        />
        <ReportButton targetId={thread.id} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
