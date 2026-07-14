import { getTrending, type TrendingGame } from "@/lib/postings/get-trending";

export type TopGame = TrendingGame;

// FR-004/research.md #4: the same question Home's Trending row and
// Browse's Game facet already answer ("which games have the most open
// postings right now") -- reuses that query directly instead of
// inventing a fourth way to ask it.
export async function getTopGames(): Promise<TopGame[]> {
  return getTrending();
}
