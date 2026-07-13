// The six fixed forum categories -- a hardcoded const, not a database
// table (research.md #1), same treatment this project already gives
// vibe/platform/region.
export const CATEGORY_KEYS = ["general", "lfg", "gametalk", "tabletop", "groups", "offtopic"] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORIES: { key: CategoryKey; label: string; dot: string }[] = [
  { key: "general", label: "General", dot: "#ffb000" },
  { key: "lfg", label: "Looking for Group", dot: "#4ec96a" },
  { key: "gametalk", label: "Game Talk", dot: "#35d0e0" },
  { key: "tabletop", label: "Tabletop & TTRPG", dot: "#ff3b6b" },
  { key: "groups", label: "Groups & Clans", dot: "#ff6b1a" },
  { key: "offtopic", label: "Off-Topic", dot: "#b49c6a" },
];

export function categoryLabel(key: string): string {
  return CATEGORIES.find((category) => category.key === key)?.label ?? key;
}

export function categoryDot(key: string): string {
  return CATEGORIES.find((category) => category.key === key)?.dot ?? "#6b5a45";
}
