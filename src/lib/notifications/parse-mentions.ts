// Pure @mention extraction — no `db` import, safe for any bundle and
// unit-testable on its own. Bound to the real handle format
// (`handleSchema`, src/lib/validations/auth.ts): a handle starts with a
// letter, is letters+numbers only, and is at most 24 chars. Matching that
// exact class after `@` means a token naturally stops at the first
// non-handle character (`@carol.` -> "carol", `@carol_x` -> "carol", since
// no handle contains `_`). The negative lookbehind stops `@` from matching
// inside an email address or a longer word (`carol@example.com` -> nothing).
const MENTION_RE = /(?<![A-Za-z0-9])@([A-Za-z][A-Za-z0-9]{0,23})/g;

// Returns the mentioned handles (without the leading `@`), lowercased and
// deduped in first-seen order. Resolution to real users happens elsewhere;
// this only tokenizes.
export function extractMentionHandles(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(MENTION_RE)) {
    const handle = match[1].toLowerCase();
    if (!seen.has(handle)) {
      seen.add(handle);
      out.push(handle);
    }
  }
  return out;
}
