"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListingCard, REGION_LABELS, type ListingCardPosting } from "@/components/listings/listing-card";

const WORDS = ["anything", "ranked", "campaigns", "raids", "board games", "one-shots"];

// Purely decorative -- aria-live="off" so it never interrupts a screen
// reader mid-sentence (plan.md's Constraints).
function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((value) => (value + 1) % WORDS.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      aria-live="off"
      className="bg-[linear-gradient(110deg,var(--color-accent),var(--color-pop))] bg-clip-text text-transparent"
    >
      {WORDS[index]}
    </span>
  );
}

// A smaller, compact second real posting -- never a full ListingCard
// (that would visually compete with the primary one), but still real
// data, never invented (research.md #4).
function SecondaryHeroCard({ posting }: { posting: ListingCardPosting }) {
  const initial = (posting.hostHandle.trim()[0] || "P").toUpperCase();
  return (
    <div className="absolute -bottom-7 -left-8 hidden items-center gap-2.5 rounded-2xl border border-border bg-surface-2 px-4 py-3 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] sm:flex">
      <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--color-accent-2),var(--color-pop))] text-sm font-bold text-on-accent">
        {initial}
      </div>
      <div>
        <div className="text-xs font-semibold text-text">{posting.game}</div>
        <div className="font-mono text-[10px] text-accent-2">
          {posting.genre ? `${posting.genre} · ` : ""}
          {REGION_LABELS[posting.region] ?? posting.region}
        </div>
      </div>
    </div>
  );
}

// A clearly-decorative fallback, never styled to look like a real
// listing -- shown only when zero postings are currently open
// (research.md #4/FR-005), e.g. a brand-new deployment.
function HeroCardFallback() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-2/60 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-2xl">🎲</div>
      <p className="text-sm font-semibold text-text">No open parties yet</p>
      <p className="mt-1 text-[13px] text-text-muted">Be the first to post one.</p>
    </div>
  );
}

export function LandingHero({
  openPartiesNow,
  totalPlayers,
  heroPostings,
}: {
  openPartiesNow: number;
  totalPlayers: number;
  heroPostings: ListingCardPosting[];
}) {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_75%_10%,rgba(255,59,107,0.12),transparent_45%),radial-gradient(circle_at_15%_30%,rgba(255,107,26,0.13),transparent_50%)]">
      <div className="mx-auto grid max-w-300 items-center gap-12 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-5.5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 font-mono text-[11px] font-bold tracking-wide text-accent-2 uppercase">
            <span className="h-1.75 w-1.75 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
            {openPartiesNow.toLocaleString()} open {openPartiesNow === 1 ? "party" : "parties"} right now
          </div>

          <h1 className="mb-5 text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-[60px]">
            Find your people.
            <br />
            Play <RotatingWord />.
          </h1>

          <p className="mb-7.5 max-w-125 text-lg leading-relaxed text-text-muted">
            playm8z matches you with players who fit — casual or competitive, any game, any table. Post what you want
            to play, set the vibe, and assemble your party.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-[13px] bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-7.5 py-4 text-base font-bold text-on-accent shadow-[0_10px_28px_-10px_rgba(255,107,26,0.8)]"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/browse"
              className="rounded-[13px] border border-border bg-surface px-6.5 py-4 text-base font-semibold text-text"
            >
              Browse games
            </Link>
          </div>

          <div className="mt-6.5 flex items-center gap-4">
            <div className="flex">
              {[
                "linear-gradient(135deg,var(--color-accent),var(--color-accent-2))",
                "linear-gradient(135deg,var(--color-accent-2),var(--color-pop))",
                "linear-gradient(135deg,var(--color-pop),var(--color-accent))",
                "linear-gradient(135deg,var(--color-accent),var(--color-pop))",
              ].map((gradient, index) => (
                <div
                  key={gradient}
                  style={{ marginLeft: index === 0 ? 0 : -10, background: gradient }}
                  className="h-8 w-8 rounded-[9px] border-2 border-bg"
                />
              ))}
            </div>
            <span className="font-mono text-xs text-text-dim">
              Join {totalPlayers.toLocaleString()}+ gamers already matched
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-95">
          {/* ListingCard renders its own <h3> -- this page's H1 has
              nothing between it and that h3 otherwise, which axe-core
              flags as an invalid heading-order jump (Home's/Post a
              Game's own precedent for this exact issue class). A
              visually-hidden h2 preserves the real design while giving
              screen readers a correct hierarchy. */}
          <h2 className="sr-only">Example open party</h2>
          {heroPostings.length > 0 ? (
            <div style={{ animation: "floaty 5s ease-in-out infinite" }}>
              <ListingCard posting={heroPostings[0]} />
            </div>
          ) : (
            <HeroCardFallback />
          )}
          {heroPostings.length > 1 && <SecondaryHeroCard posting={heroPostings[1]} />}
        </div>
      </div>
    </div>
  );
}
