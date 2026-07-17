import { requireRole } from "@/lib/auth/require-role";
import { getAdminGames } from "@/lib/games/get-admin-games";
import { GamesManager } from "@/components/admin/games-manager";

// 035/FR-008: moderator-or-higher, matching the News editor gate (content
// curation, not admin-only site settings). Its own admin surface, NOT the
// Settings Lists chip editor -- games carry images and aliases, which a flat
// string list can't hold (FR-009).
export default async function AdminGamesPage() {
  await requireRole("moderator");
  const games = await getAdminGames();

  return (
    <main className="grow bg-bg text-text">
      <div className="mx-auto max-w-4xl px-8 pt-8 pb-16">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Game images</h1>
        <p className="mb-6 text-sm text-text-muted">
          Attach a headline image to a game name so it shows on Home&apos;s Trending tiles.
          Games without an image get a distinct auto-generated tile. Aliases catch spelling
          variants hosts type.
        </p>
        <GamesManager initialGames={games} />
      </div>
    </main>
  );
}
