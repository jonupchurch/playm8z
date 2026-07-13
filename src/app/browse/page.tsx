import { browseFiltersSchema } from "@/lib/validations/browse-filters";
import { searchPostings } from "@/lib/postings/search-postings";
import { getGameFacetCounts, getRegionFacetCounts } from "@/lib/postings/get-facet-counts";
import { ListingCard } from "@/components/listings/listing-card";
import { SearchHeader } from "@/components/browse/search-header";
import { FilterSidebar } from "@/components/browse/filter-sidebar";
import { ActivePills } from "@/components/browse/active-pills";
import { SortControl } from "@/components/browse/sort-control";
import { BrowseEmptyState } from "@/components/browse/browse-empty-state";

// Public (no authentication required, per FR-001) -- unlike Home,
// facet state lives in the URL and drives a real server-side query
// (research.md #1), not a client-side filter over one fetched list.
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const filters = browseFiltersSchema.parse(rawParams);

  const [results, gameFacets, regionFacets] = await Promise.all([
    searchPostings(filters),
    getGameFacetCounts(filters),
    getRegionFacetCounts(filters),
  ]);

  return (
    <main className="min-h-screen bg-bg text-text">
      <div
        className="border-b border-border"
        style={{
          backgroundImage: "radial-gradient(circle at 30% -40%, rgba(255,107,26,0.1), transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-330 px-8 pt-7 pb-6">
          <h1 className="mb-1 text-[28px] font-bold tracking-tight">Browse open games</h1>
          <p className="mb-4.5 text-sm text-text-muted">
            Search and filter every live party looking for players — video games, tabletop &amp;
            TTRPGs.
          </p>
          <SearchHeader />
        </div>
      </div>

      <div className="mx-auto grid max-w-330 grid-cols-1 gap-7 px-8 pt-6 pb-18 lg:grid-cols-[284px_1fr] lg:items-start">
        <FilterSidebar gameFacets={gameFacets} regionFacets={regionFacets} />

        <div>
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <span aria-live="polite" className="font-mono text-xs text-text-muted">
              <span className="font-bold text-text">{results.length}</span> parties
            </span>
            <SortControl />
          </div>

          <ActivePills />

          {results.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((posting) => (
                <ListingCard key={posting.id} posting={posting} />
              ))}
            </div>
          ) : (
            <BrowseEmptyState />
          )}
        </div>
      </div>
    </main>
  );
}
