import type { InCommon } from "@/lib/profile/get-in-common";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";

function avatarGradient(color: string | null) {
  return AVATAR_COLORS.find((swatch) => swatch.id === color)?.gradient ?? AVATAR_COLORS[0].gradient;
}

// FR-008: mutual follows + shared games, authenticated non-self
// viewers only -- the caller (page.tsx) never renders this for a
// logged-out or self view, so there's no separate prop guarding that
// here.
export function ProfileInCommon({ mutualFollows, sharedGames }: InCommon) {
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
                  <div
                    key={follow.id}
                    style={{ background: avatarGradient(follow.avatarColor), marginLeft: index > 0 ? "-8px" : 0 }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-surface-2 text-[11px] font-bold text-on-accent"
                  >
                    {follow.handle.slice(0, 1).toUpperCase()}
                  </div>
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
