/**
 * The one normalisation rule for game-name matching (035/FR-003). Used at
 * every point a game name is compared: storing a game's `normalizedName`,
 * storing an alias's `normalizedAlias`, and looking either up at read time.
 * Being the SINGLE definition is the point -- if write-time and read-time
 * normalised differently, a curated image would silently never match.
 *
 * Correction to research.md #3 / data-model.md (verified 2026-07-17): those
 * docs said this MUST equal how `get-trending.ts` groups games, on the
 * strength of ADR 0001's prose ("case-insensitive, trimmed"). The actual
 * code groups by the RAW `postings.game` string, so "D&D 5e" and "d&d 5e"
 * are two separate trending rows today. That's fine and needs no change:
 * the resolver takes each raw trending string and normalises it here purely
 * to look up an image, so both rows resolve to the same game's image
 * (spec Edge Cases explicitly allow this). Trending's grouping is untouched
 * (FR-006); this normalisation only governs image lookup, never counting.
 */
export function normalizeGame(name: string): string {
  return name.trim().toLowerCase();
}
