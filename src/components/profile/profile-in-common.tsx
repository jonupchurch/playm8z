import { Avatar } from "@/components/ui/avatar";
import type { InCommon, MutualFollow } from "@/lib/profile/get-in-common";

// The mutual-follow avatars render through the shared <Avatar>, so each
// follow must carry the uploaded/Google image alongside its gradient
// colour (034/FR-008). The feeder query (get-in-common.ts) selects
// `avatarImage`/`image` next to `avatarColor`.
type InCommonProps = {
  mutualFollows: (MutualFollow & { avatarImage: string | null; image: string | null })[];
  sharedGames: InCommon["sharedGames"];
};

// FR-008: mutual follows + shared games, authenticated non-self
// viewers only -- the caller (page.tsx) never renders this for a
// logged-out or self view, so there's no separate prop guarding that
// here.
export function ProfileInCommon({ mutualFollows, sharedGames }: InCommonProps) {
  const isEmpty = mutualFollows.length === 0 && sharedGames.length === 0;

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5">
      <div className="mb-3.5 font-mono text-[10px] tracking-[0.14em] text-pop-text uppercase">You have in common</div>
      {isEmpty ? (
        <p className="text-sm text-text-dim">Nothing in common yet.</p>
      ) : (
        <>
          {mutualFollows.length > 0 && (
            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="flex">
                {mutualFollows.slice(0, 3).map((follow, index) => (
                  <Avatar
                    key={follow.id}
                    avatarImage={follow.avatarImage}
                    googleImage={follow.image}
                    avatarColor={follow.avatarColor}
                    handle={follow.handle}
                    className={`h-7 w-7 rounded-lg border-2 border-surface-2 text-[11px] ${index > 0 ? "-ml-2" : ""}`}
                  />
                ))}
              </div>
              <span className="text-[13px] text-text-muted">
                {mutualFollows.length} mutual follow{mutualFollows.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
          {sharedGames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sharedGames.map((game) => (
                <span
                  key={game}
                  className="rounded-full border border-[rgba(255,176,0,0.35)] bg-[rgba(255,176,0,0.12)] px-2.5 py-1 font-mono text-[11px] text-[#ffd08a]"
                >
                  {game}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
