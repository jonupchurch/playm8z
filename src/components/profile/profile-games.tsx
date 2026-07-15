// FR-001/FR-003: just the games list -- no per-game rank/hours (both
// dropped, research.md #1; no per-game rank/playtime tracking exists
// anywhere in this project).
export function ProfileGames({ handle, games }: { handle: string; games: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-4 font-mono text-[10px] tracking-[0.16em] text-pop-text uppercase">Games {handle} plays</div>
      {games.length === 0 ? (
        <p className="text-sm text-text-dim">No games listed yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {games.map((game) => (
            <div key={game} className="overflow-hidden rounded-[13px] border border-border bg-surface">
              <div className="h-2 bg-[linear-gradient(90deg,var(--color-accent),var(--color-accent-2))]" />
              <div className="px-3.5 py-3">
                <div className="text-[15px] font-bold text-text">{game}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
