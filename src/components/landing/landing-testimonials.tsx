// research.md #6: fixed, hand-written marketing copy -- the one
// deliberate exception to this project's no-fake-data discipline.
// A testimonial section is universally understood as curated
// editorial copy, not a claim of a real, verifiable, live data feed
// (unlike every stat/badge/card elsewhere on this page).
const QUOTES = [
  {
    text: "Found a weeknight Helldivers crew in a day. We've played together every week since.",
    name: "Mara",
    role: "Co-op main",
    initial: "M",
    avatar: "linear-gradient(135deg,var(--color-accent),var(--color-pop))",
  },
  {
    text: "As a GM, filling a D&D table used to take weeks. On playm8z it took one afternoon.",
    name: "GM_Dave",
    role: "Dungeon Master",
    initial: "G",
    avatar: "linear-gradient(135deg,var(--color-accent-2),var(--color-accent))",
  },
  {
    text: "The vibe filter is genius. No more tryhards in my chill lobbies or vice versa.",
    name: "Vex_00",
    role: "Ranked grinder",
    initial: "V",
    avatar: "linear-gradient(135deg,var(--color-accent-2),var(--color-pop))",
  },
];

export function LandingTestimonials() {
  return (
    <div className="border-t border-b border-border bg-surface-2/50">
      <div className="mx-auto max-w-275 px-6 py-18 sm:px-10">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Loved by players &amp; game masters
        </h2>
        <div className="grid gap-4.5 sm:grid-cols-3">
          {QUOTES.map((quote) => (
            <div key={quote.name} className="rounded-2xl border border-border bg-surface p-5.5">
              <div className="mb-3 text-[13px] text-accent">★★★★★</div>
              <p className="mb-4 text-sm leading-relaxed text-text">&ldquo;{quote.text}&rdquo;</p>
              <div className="flex items-center gap-2.5">
                <div
                  style={{ background: quote.avatar }}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] text-xs font-bold text-on-accent"
                >
                  {quote.initial}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-text">{quote.name}</div>
                  <div className="font-mono text-[10px] text-text-dim">{quote.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
