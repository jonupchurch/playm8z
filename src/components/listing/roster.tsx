import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import type { Roster as RosterData } from "@/lib/postings/get-roster";

// FR-004: host + accepted members + dashed open rows -- no role/class
// label on any row (ADR 0004 dropped the wireframe's Controller/
// Sentinel/etc. labels entirely). Purely presentational -- the roster
// itself is derived server-side (get-roster.ts), nothing here mutates.
export function Roster({ roster, seatsTotal }: { roster: RosterData; seatsTotal: number }) {
  const filled = seatsTotal - roster.openCount;

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-[10px] tracking-wider text-accent-2 uppercase">Party roster</h2>
        <span className="font-mono text-[11px] text-text-muted">
          {filled} of {seatsTotal} filled
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {roster.rows.map((row, index) => {
          if (row.kind === "open") {
            return (
              <div
                key={`open-${index}`}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3.5 py-2.5"
              >
                <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg border border-dashed border-text-dim/40 bg-surface text-lg font-bold text-text-dim">
                  +
                </div>
                <div className="flex-1 text-[14px] text-text-dim">Open slot</div>
                <span className="rounded-full border border-accent-2/40 bg-accent-2/10 px-2.5 py-1 font-mono text-[10px] font-bold text-accent-2">
                  Open
                </span>
              </div>
            );
          }

          const avatarGradient =
            AVATAR_COLORS.find((swatch) => swatch.id === row.avatarColor)?.gradient ?? AVATAR_COLORS[0].gradient;
          const isHost = row.kind === "host";

          return (
            <div
              key={`${row.kind}-${row.handle}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5"
            >
              <div
                style={{ background: avatarGradient }}
                className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-on-accent"
              >
                {(row.handle.trim()[0] || "P").toUpperCase()}
              </div>
              <div className="flex-1 text-[14px] font-bold text-text">@{row.handle}</div>
              <span
                className={
                  isHost
                    ? "rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-2.5 py-1 font-mono text-[10px] font-bold text-on-accent"
                    : "rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-bold text-text-muted"
                }
              >
                {isHost ? "Host" : "Member"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
