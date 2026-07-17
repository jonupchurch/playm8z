import { auth } from "@/auth";
import { getOpenPostings } from "@/lib/postings/get-open-postings";
import { getTrending } from "@/lib/postings/get-trending";
import { resolveGameImages } from "@/lib/games/resolve-game-image";
import { normalizeGame } from "@/lib/games/normalize-game";
import { generatedVisual } from "@/lib/games/generated-visual";
import { LiveFeed } from "@/components/home/live-feed";
import { getLandingStats } from "@/lib/landing/get-landing-stats";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingTrustBar } from "@/components/landing/landing-trust-bar";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingGenres } from "@/components/landing/landing-genres";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

// Nav/footer shell are shared Design System infrastructure, out of
// this feature's own scope (spec.md's Assumptions) -- this covers only
// the hero/search/trending/live-feed content area. Landing page (026)
// closes the loop left open here (research.md #3 there): an
// unauthenticated visitor now sees that feature's real marketing
// content instead of a redirect to /login; an authenticated visitor's
// experience below is completely unchanged.
export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    const stats = await getLandingStats();
    return (
      <main className="grow bg-bg text-text">
        <LandingHero openPartiesNow={stats.openPartiesNow} totalPlayers={stats.totalPlayers} heroPostings={stats.heroPostings} />
        <LandingTrustBar
          totalPlayers={stats.totalPlayers}
          gamesAndTables={stats.gamesAndTables}
          partiesFormedThisWeek={stats.partiesFormedThisWeek}
        />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingGenres genreCounts={stats.genreCounts} />
        <LandingTestimonials />
        <LandingFinalCta />
        <LandingFooter />
      </main>
    );
  }

  const [postings, trendingGames] = await Promise.all([getOpenPostings(), getTrending()]);

  // Resolve each trending game to its image (admin or generated) server-side,
  // in ONE batched query, so the client TrendingRow just paints the result
  // (035/FR-005). resolveGameImages guarantees an entry for every name.
  const images = await resolveGameImages(trendingGames.map((t) => t.game));
  const trending = trendingGames.map((t) => ({
    ...t,
    image: images.get(normalizeGame(t.game)) ?? { kind: "generated" as const, visual: generatedVisual(t.game) },
  }));

  return (
    <main className="grow bg-bg text-text">
      <div
        className="mx-auto max-w-[920px] px-8 pt-16 pb-11 text-center"
        style={{
          backgroundImage: "radial-gradient(circle at 50% -10%, rgba(255,107,26,0.13), transparent 55%)",
        }}
      >
        <div className="mb-4.5 font-mono text-[11px] tracking-[0.34em] text-accent-2 uppercase">
          Assemble your party
        </div>
        <h1 className="mb-4 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          Find people to play{" "}
          <span className="bg-[linear-gradient(110deg,var(--color-accent),var(--color-pop))] bg-clip-text text-transparent">
            anything
          </span>{" "}
          with.
        </h1>
        <p className="mx-auto max-w-[520px] text-base leading-relaxed text-text-muted">
          Post the games you want to play, set the vibe, and match with players who fit — casual
          or competitive, any game, any platform.
        </p>
      </div>

      <LiveFeed postings={postings} trending={trending} />
    </main>
  );
}
