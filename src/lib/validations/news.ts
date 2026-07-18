import { z } from "zod";

// The five hardcoded News categories (research.md #2, data-model.md) --
// a small fixed set, not a database table, same treatment Forum's own
// categories get.
export const NEWS_CATEGORIES = ["Announcement", "Update", "Event", "Community", "Patch Notes"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export function newsCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Announcement: "#ffb000",
    Update: "#ff6b1a",
    Event: "#35d0e0",
    Community: "#ff3b6b",
    "Patch Notes": "#8fe0a3",
  };
  return colors[category] ?? "#ffb000";
}

// A visitor-controlled URL query string feeds this straight into a
// database WHERE clause (search-news.ts) -- validated before it can
// reach the query builder (Principle II). `.catch()` (not `.parse()`
// throwing) matches Browse's own precedent: a tampered/garbage query
// param degrades gracefully to the default rather than erroring the
// whole page.
export const newsFiltersSchema = z.object({
  category: z.enum(["all", ...NEWS_CATEGORIES]).catch("all"),
  q: z.string().max(200).optional().default(""),
  page: z.coerce.number().int().min(1).catch(1),
});
export type NewsFilters = z.infer<typeof newsFiltersSchema>;
