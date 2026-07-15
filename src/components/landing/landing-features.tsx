const FEATURES = [
  {
    icon: "🎲",
    bg: "rgba(255,176,0,0.14)",
    title: "Every game & table",
    body: "From FPS and MOBAs to D&D, board games and TTRPGs — online or in person.",
  },
  {
    icon: "⚖️",
    bg: "rgba(255,107,26,0.14)",
    title: "Casual or serious",
    body: "Say whether you're here to chill or to climb — and only match with people who feel the same.",
  },
  {
    // research.md #5: reworded from the wireframe's "Real profiles &
    // ratings" -- reliabilityPct was explicitly deferred, and Public
    // Profile's (022) Review entity has no writer yet, so this
    // describes only what's real today (a profile, games played,
    // region/platform info), not deferred/inert capabilities.
    icon: "⭐",
    bg: "rgba(255,59,107,0.14)",
    title: "Real player profiles",
    body: "See games played, region, and platform before you commit — fewer no-shows, fewer surprises.",
  },
  {
    icon: "🎧",
    bg: "rgba(53,208,224,0.12)",
    title: "Discord integration",
    soon: true,
    body: "Auto-create voice channels and get LFG pings right where your friends already hang out.",
  },
];

// Static, no data dependency.
export function LandingFeatures() {
  return (
    <div className="border-t border-b border-border bg-surface-2/50">
      <div className="mx-auto max-w-275 px-6 py-20 sm:px-10">
        <div className="mb-12 text-center">
          <div className="mb-3 font-mono text-[11px] tracking-[0.28em] text-accent-2 uppercase">Why playm8z</div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for every kind of player</h2>
        </div>
        <div className="grid gap-4.5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-4.5 rounded-2xl border border-border bg-surface p-6.5">
              <div
                style={{ background: feature.bg }}
                className="flex h-11.5 w-11.5 shrink-0 items-center justify-center rounded-[13px] text-xl"
              >
                {feature.icon}
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <h3 className="text-base font-bold text-text">{feature.title}</h3>
                  {feature.soon && (
                    <span className="rounded-md border border-info/35 bg-info/10 px-1.75 py-0.5 font-mono text-[9px] font-bold text-info">
                      SOON
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-text-muted">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
