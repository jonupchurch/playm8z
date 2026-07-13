import { z } from "zod";
import { CATEGORY_KEYS } from "@/lib/forum/categories";

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

// Server-side boundary for /forum's searchParams (Principle II) --
// category/search/sort are validated before reaching search-threads.ts,
// same discipline Browse already established for its own filters.
export const forumSearchParamsSchema = z.object({
  category: z.enum(["all", ...CATEGORY_KEYS]).catch("all"),
  q: z.string().trim().max(200).catch(""),
  sort: z.enum(["latest", "top", "unanswered"]).catch("latest"),
});

export type ForumSearchParams = z.infer<typeof forumSearchParamsSchema>;

// Server-side boundary for create-thread.ts's Server Action.
export const createThreadSchema = z.object({
  categoryId: z.enum(CATEGORY_KEYS),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
  tags: z.preprocess(toStringArray, z.array(z.string().max(30)).max(6)).default([]),
});

export type CreateThreadInput = z.input<typeof createThreadSchema>;
export type CreateThreadData = z.infer<typeof createThreadSchema>;
