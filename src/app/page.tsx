import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOpenPostings } from "@/lib/postings/get-open-postings";
import { getTrending } from "@/lib/postings/get-trending";
import { LiveFeed } from "@/components/home/live-feed";

// Nav/footer are shared Design System infrastructure, out of this
// feature's own scope (spec.md's Assumptions) -- this covers only the
// hero/search/trending/live-feed content area. Unauthenticated visitors
// redirect to /login until Landing exists (research.md #3).
export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [postings, trending] = await Promise.all([getOpenPostings(), getTrending()]);

  return (
    <main className="min-h-screen bg-bg text-text">
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
