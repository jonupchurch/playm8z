import { normalizeGame } from "@/lib/games/normalize-game";

/** One curated game, for the "did you mean?" source: its canonical name and
 *  the known spelling variants (035's aliases) that map to it. */
export interface GameEntry {
  canonical: string;
  aliases: string[];
}

const MIN_TYPEAHEAD_QUERY = 2;

/**
 * Existing game names that match what the host is typing (036/FR-001).
 * Normalised-substring match, prefix matches first, capped. Returns the
 * ORIGINAL canonical spellings (not normalised) for display. An exact match
 * is excluded — there's nothing to suggest about what's already typed.
 *
 * Purely local and deterministic (FR-006): no AI, no network.
 */
export function typeaheadMatches(query: string, names: string[], limit = 6): string[] {
  const q = normalizeGame(query);
  if (q.length < MIN_TYPEAHEAD_QUERY) return [];

  const scored: { name: string; rank: number }[] = [];
  for (const name of names) {
    const n = normalizeGame(name);
    if (n === q) continue; // already an exact match; nothing to suggest
    const idx = n.indexOf(q);
    if (idx === -1) continue;
    scored.push({ name, rank: idx === 0 ? 0 : 1 }); // prefix matches first
  }

  scored.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return scored.slice(0, limit).map((s) => s.name);
}

/**
 * The closest existing game to a near-miss (036/FR-004), or null.
 *
 * Returns null when the typed value already exactly matches a CANONICAL name
 * (nothing to correct), and when nothing is close enough (no false nudges,
 * SC-003).
 *
 * An exact match to an ALIAS is NOT "nothing to correct" — it is the
 * strongest possible signal to nudge, because a human already confirmed that
 * alias is a variant of its canonical. So an alias match (exact or fuzzy)
 * resolves to, and suggests, the canonical name. (This resolves a
 * contradiction in the original spec, where FR-005's "or alias" clause
 * fought the Edge Case that says an alias should point at its canonical —
 * the Edge Case wins; consolidating the spelling is the feature's whole
 * point. Noted in spec.md.)
 */
export function didYouMean(query: string, entries: GameEntry[]): string | null {
  const q = normalizeGame(query);
  if (q.length < MIN_TYPEAHEAD_QUERY) return null;

  // Typing a real canonical name exactly -> nothing to improve.
  for (const entry of entries) {
    if (normalizeGame(entry.canonical) === q) return null;
  }

  // Otherwise, the closest game within threshold across canonical + aliases.
  // An exact alias hit is distance 0 and always wins.
  let best: { canonical: string; dist: number } | null = null;
  for (const entry of entries) {
    for (const form of [entry.canonical, ...entry.aliases].map(normalizeGame)) {
      const dist = levenshtein(q, form);
      if (dist <= thresholdFor(q, form) && (best === null || dist < best.dist)) {
        best = { canonical: entry.canonical, dist };
      }
    }
  }
  return best?.canonical ?? null;
}

// Allow more edits for longer names, fewer for short ones -- so "Valornt" ->
// "Valorant" (1 edit, len 7) fires, but two unrelated short names don't.
function thresholdFor(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

// Standard Levenshtein edit distance. Names are short; this is cheap.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}
