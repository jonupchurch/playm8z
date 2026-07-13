import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import { relativeAge } from "@/components/listings/listing-card";
import { LikeButton } from "@/components/forum/like-button";
import { ReportButton } from "@/components/forum/report-button";
import type { ReplyDetail } from "@/lib/forum/get-thread";

// FR-007: a "Quote" trigger surfaces the reply's author/body up to the
// composer via onQuote -- the composer itself carries them along with
// the new reply (quotedReplyId). Author identity is always @handle,
// never display name (ADR 0006).
export function ReplyCard({
  reply,
  onQuote,
  isLoggedIn,
}: {
  reply: ReplyDetail;
  onQuote: (reply: { id: string; authorHandle: string; body: string }) => void;
  isLoggedIn: boolean;
}) {
  const avatarGradient =
    AVATAR_COLORS.find((swatch) => swatch.id === reply.authorAvatarColor)?.gradient ?? AVATAR_COLORS[0].gradient;
  const initial = (reply.authorHandle.trim()[0] || "P").toUpperCase();

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
      <div className="mb-3 flex items-center gap-2.5">
        <div
          style={{ background: avatarGradient }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-on-accent"
        >
          {initial}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-text">@{reply.authorHandle}</span>
            {reply.isOP && (
              <span className="rounded-md bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-1.5 py-0.5 font-mono text-[9px] font-bold text-on-accent">
                OP
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] text-text-dim">{relativeAge(reply.createdAt)}</div>
        </div>
      </div>

      {reply.quotedReplyId && (
        <div className="mb-2.5 border-l-2 border-border pl-3">
          <div className="mb-0.5 font-mono text-[10px] text-accent-2">@{reply.quotedAuthorHandle} wrote</div>
          <p className="text-[12.5px] leading-relaxed text-text-dim italic">{reply.quotedBody}</p>
        </div>
      )}

      <p className="mb-3.5 text-sm leading-relaxed whitespace-pre-wrap text-text-muted">{reply.body}</p>

      <div className="flex items-center gap-1.5">
        <LikeButton
          targetType="reply"
          targetId={reply.id}
          initialLikes={reply.likes}
          initialLiked={reply.likedByViewer}
          isLoggedIn={isLoggedIn}
        />
        <button
          type="button"
          onClick={() => onQuote({ id: reply.id, authorHandle: reply.authorHandle, body: reply.body })}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-text-muted"
        >
          Quote
        </button>
        <ReportButton targetId={reply.id} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
