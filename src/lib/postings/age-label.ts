// A posting's age group: who a party is FOR, not a minimum age to join
// (ADR 0009, superseding ADR 0002's Posting ruling). It is a label and a
// filter -- never an access control. The platform has no verified ages;
// gating on this would be a claim it cannot back up.
//
// Distinct from `users.ageGroup`, which is still 18|21 (ADR 0002,
// unchanged). Same name, different vocabulary, on purpose. Do not
// "unify" them.
export const POSTING_AGE_GROUPS = ["any", "18-29", "30-49", "50plus"] as const;
export type PostingAgeGroup = (typeof POSTING_AGE_GROUPS)[number];

// `50plus`, NOT `50+`. The Browse filter travels in a URL query string,
// where `+` decodes to a space -- a stored `50+` would arrive as "50 "
// and match nothing. That bug appears only in a real browser and never
// in a test that passes the value directly, which is the worst possible
// failure shape. The token is URL-safe; the "+" lives in the label.
const LABELS: Record<string, string> = {
  any: "Any",
  "18-29": "18-29",
  "30-49": "30-49",
  "50plus": "50+",
  // Legacy, display-only. Postings created before ADR 0009 still hold
  // these and are never rewritten (FR-011); they age out on their own
  // within 30 days (ADR 0003). No UI can produce them any more, so these
  // two entries are the ones most likely to be dropped from this map and
  // from its tests -- and nothing would fail loudly if they were.
  "18": "18+",
  "21": "21+",
};

// Age used to be rendered by appending "+" to the raw stored value,
// which silently produces "50plus+" and "30-49+" for the new vocabulary:
// it throws nothing, fails no type check, and just looks wrong. Hence a
// map rather than concatenation.
//
// An unrecognised value returns itself rather than throwing -- a page
// must never 500 over a label (FR-009).
export function postingAgeLabel(value: string): string {
  return LABELS[value] ?? value;
}
