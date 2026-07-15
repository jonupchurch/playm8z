const STEPS = [
  {
    n: "1",
    icon: "📣",
    bg: "rgba(255,176,0,0.14)",
    title: "Post or find a game",
    body: "List the game you want to play, or browse thousands of live parties looking for players.",
  },
  {
    n: "2",
    icon: "🎯",
    bg: "rgba(255,107,26,0.14)",
    title: "Match on your terms",
    body: "Filter by vibe, region, platform, time slot and age. Find people who actually fit.",
  },
  {
    n: "3",
    icon: "🎮",
    bg: "rgba(255,59,107,0.14)",
    title: "Play together",
    body: "Coordinate in chat, jump in, and build a crew that sticks.",
  },
];

// Static, no data dependency -- every step describes a real, already-
// shipped capability (Post a Game/005, Browse/004, Inbox/011).
export function LandingHowItWorks() {
  return (
    <div className="mx-auto max-w-275 px-6 py-20 sm:px-10">
      <div className="mb-12 text-center">
        <div className="mb-3 font-mono text-[11px] tracking-[0.28em] text-accent-2 uppercase">How it works</div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From solo to squad in three steps</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-2xl border border-border bg-surface p-7">
            <div
              style={{ background: step.bg }}
              className="mb-4.5 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
            >
              {step.icon}
            </div>
            <div className="mb-2 font-mono text-[11px] font-bold text-accent-2">STEP {step.n}</div>
            <h3 className="mb-2 text-lg font-bold text-text">{step.title}</h3>
            <p className="text-sm leading-relaxed text-text-muted">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
