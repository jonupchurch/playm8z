"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { gameAliasDismissals, gameAliases, games, postings } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { requireAuth } from "@/lib/auth/require-auth";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { generateStructuredDraft } from "@/lib/ai/gateway";
import { normalizeGame } from "@/lib/games/normalize-game";
import { addGameAlias } from "@/lib/actions/manage-game";

export interface AliasSuggestion {
  /** The unmatched game string as it appears in postings (first-seen spelling). */
  rawName: string;
  /** The game it likely belongs to. */
  gameId: string;
  gameName: string;
}

export type SuggestAliasesResult =
  | { available: true; suggestions: AliasSuggestion[] }
  | { available: false; reason: string };

const aiSchema = z.object({
  matches: z.array(z.object({ rawName: z.string(), gameId: z.string() })),
});

/**
 * AI-ASSIST, "suggests, admin approves" (035/FR-017..020). Looks at the real
 * unmatched game strings sitting in postings and PROPOSES which curated game
 * each likely belongs to. It writes NOTHING -- an alias exists only after a
 * moderator accepts one (acceptAliasSuggestion). The AI runs only here, in
 * this batch, moderator-initiated path -- never on the render/read path.
 *
 * If no AI provider is configured, this degrades gracefully: management by
 * hand still works, only the suggestion convenience is unavailable (FR-020).
 */
export async function suggestGameAliases(): Promise<SuggestAliasesResult> {
  await requireRole("moderator");

  const [gameRows, aliasRows, dismissalRows, postingGameRows] = await Promise.all([
    db.select({ id: games.id, name: games.name, normalizedName: games.normalizedName }).from(games).where(isNull(games.disabledAt)),
    db.select({ normalizedAlias: gameAliases.normalizedAlias }).from(gameAliases),
    db.select({ normalizedName: gameAliasDismissals.normalizedName }).from(gameAliasDismissals),
    db.select({ game: postings.game }).from(postings).where(and(eq(postings.status, "open"), isNull(postings.removedAt))),
  ]);

  if (gameRows.length === 0) {
    return { available: true, suggestions: [] }; // nothing to match against
  }

  // Everything already "known" -- a curated name, an alias, or an explicit
  // dismissal -- is excluded so we only propose genuinely unmatched strings.
  const known = new Set<string>([
    ...gameRows.map((g) => g.normalizedName),
    ...aliasRows.map((a) => a.normalizedAlias),
    ...dismissalRows.map((d) => d.normalizedName),
  ]);

  // Distinct unmatched posting game strings, keeping the first spelling seen.
  const unmatched = new Map<string, string>(); // normalized -> first raw
  for (const { game } of postingGameRows) {
    const norm = normalizeGame(game);
    if (!norm || known.has(norm) || unmatched.has(norm)) continue;
    unmatched.set(norm, game.trim());
  }
  if (unmatched.size === 0) return { available: true, suggestions: [] };

  const gameList = gameRows.map((g) => `${g.id}: ${g.name}`).join("\n");
  const unmatchedList = [...unmatched.values()].map((s) => `- ${s}`).join("\n");

  let ai: z.infer<typeof aiSchema>;
  try {
    ai = await generateStructuredDraft(
      aiSchema,
      "You map misspelled or variant video/tabletop game names to a canonical game from a provided list. Only map a string when you are confident it refers to that exact game; when unsure, omit it. Never invent a gameId.",
      `Canonical games (id: name):\n${gameList}\n\nUnmatched names to map (omit any you're unsure about):\n${unmatchedList}`,
    );
  } catch (err) {
    // No key / gateway error: the whole feature still works by hand.
    return { available: false, reason: err instanceof Error ? err.message : "AI is unavailable." };
  }

  const gameById = new Map(gameRows.map((g) => [g.id, g.name]));
  const byNormalizedRaw = new Map([...unmatched.values()].map((raw) => [normalizeGame(raw), raw]));

  const suggestions: AliasSuggestion[] = [];
  for (const m of ai.matches) {
    const gameName = gameById.get(m.gameId);
    const raw = byNormalizedRaw.get(normalizeGame(m.rawName));
    // Drop hallucinations: a gameId not in the list, or a rawName that
    // wasn't actually one of the unmatched strings we asked about.
    if (gameName && raw) suggestions.push({ rawName: raw, gameId: m.gameId, gameName });
  }

  return { available: true, suggestions };
}

export type AcceptRejectResult = { success: true } | { success: false; error: string };

/**
 * Accept a suggestion -> becomes an alias via the SAME FR-015-checked path a
 * manual add uses (manage-game.addGameAlias). Never a shortcut around the
 * rules (FR-018).
 */
export async function acceptAliasSuggestion(gameId: string, rawName: string): Promise<AcceptRejectResult> {
  return addGameAlias(gameId, rawName);
}

/** Reject a suggestion -> remember it so it doesn't reappear next run (US4-3). */
export async function dismissAliasSuggestion(rawName: string): Promise<AcceptRejectResult> {
  await requireRole("moderator");
  const actor = await requireAuth();
  const normalized = normalizeGame(rawName);
  if (!normalized) return { success: false, error: "Nothing to dismiss." };
  await db.insert(gameAliasDismissals).values({ normalizedName: normalized }).onConflictDoNothing();
  await logAuditEntry({ actorId: actor.id, action: `dismissed game-alias suggestion "${normalized}"`, category: "content" });
  return { success: true };
}
