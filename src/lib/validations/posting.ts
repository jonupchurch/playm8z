import { z } from "zod";
import { REGIONS, TIME_SLOTS } from "@/lib/validations/browse-filters";

// A posting's own platform value, distinct from Browse's facet-filter
// PLATFORMS (which adds a leading "any" wildcard that doesn't apply to
// a real posting).
export const PLATFORMS = ["pc", "console", "cross", "table"] as const;

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function emptyToUndefined(value: unknown): unknown {
  return value === "" || value == null ? undefined : value;
}

// Server-side boundary for /post's Server Action (Principle II) --
// every field is re-validated here, never trusting the form's own
// client-side clamping/formatting as sufficient (research.md #5).
export const postingSchema = z
  .object({
    game: z.string().trim().min(1).max(100),
    // Shape only. Membership in the admin's genre list is NOT checked
    // here and deliberately cannot be: the list is admin-editable since
    // 030, and z.enum() needs its values at module-evaluation time
    // (research.md #3). The actions check membership instead --
    // create-posting.ts strictly, manage-posting.ts tolerantly (it must
    // still accept a genre this posting already stores, or a host whose
    // genre got retired could never edit their own posting again).
    // Restoring z.enum() here would silently re-freeze the list.
    genre: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
    title: z.string().trim().min(1).max(60),
    blurb: z.string().trim().max(240).optional().default(""),
    tags: z.preprocess(toStringArray, z.array(z.string().max(30)).max(6)).default([]),
    vibe: z.enum(["fun", "serious"]).default("fun"),
    platform: z.enum(PLATFORMS),
    region: z.enum(REGIONS),
    ageGroup: z.enum(["18", "21"]).default("18"),
    timeSlots: z.array(z.enum(TIME_SLOTS)).max(5).default([]),
    scheduledDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    recurring: z.boolean().default(false),
    seatsTotal: z.coerce.number().int().min(2).max(8),
    seatsOpen: z.coerce.number().int().min(1),
    micRequired: z.boolean().default(false),
    voiceLink: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(300).optional(),
    ),
  })
  .refine((data) => data.seatsOpen <= data.seatsTotal - 1, {
    message: "Spots open must be less than the group size.",
    path: ["seatsOpen"],
  });

export type PostingInput = z.input<typeof postingSchema>;
export type PostingData = z.infer<typeof postingSchema>;
