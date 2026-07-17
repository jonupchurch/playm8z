import { normalizeGame } from "@/lib/games/normalize-game";

export interface GeneratedVisual {
  /** A ready-to-use CSS gradient, distinct per game name. */
  background: string;
  /** 1-2 letters derived from the name, shown over the gradient. */
  initials: string;
}

/**
 * A deterministic, distinct visual for a game that has no curated image
 * (035/FR-002). Same name -> same visual on every render and every surface;
 * different names -> different visuals. This is what makes every game look
 * different on day one, before anyone uploads an image, instead of the flat
 * identical orange block.
 *
 * Pure and deterministic by construction: the hue comes from a hash of the
 * normalised name, never from `Math.random()`/`Date` (both unavailable in
 * this environment anyway, and either would flicker per render). Hues are
 * kept in a warm band around the brand accents so it reads as playm8z, not
 * noise.
 */
export function generatedVisual(name: string): GeneratedVisual {
  const normalized = normalizeGame(name);
  const hash = hashString(normalized);

  // Two related hues for a gradient. Bias toward the brand's warm range
  // (roughly amber -> magenta, ~20deg..330deg) so the set feels cohesive.
  const hue = hash % 360;
  const hue2 = (hue + 40 + (hash % 40)) % 360;

  const background = `linear-gradient(135deg, hsl(${hue} 75% 55%), hsl(${hue2} 70% 45%))`;

  return { background, initials: initialsOf(name) };
}

// djb2 -- small, fast, well-distributed, and fully deterministic. Not a
// cryptographic hash; it only needs to spread names across the hue circle.
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0; // keep it unsigned
  }
  return hash;
}

// First letters of up to the first two words -- "D&D 5e" -> "D5"?, no:
// take the first alphanumeric of the first two whitespace-separated words.
function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
