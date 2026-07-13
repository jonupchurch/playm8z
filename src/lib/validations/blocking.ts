import { z } from "zod";

// Server-side boundary for candidate search and the block/unblock
// Server Actions (Principle II). Self-block/duplicate-block rejection
// happens as plain runtime checks in block-user.ts (it needs the
// acting user's own id, which isn't available at schema-definition
// time), not via a Zod refine here.
export const candidateSearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
});

export const blockUserSchema = z.object({
  blockedId: z.string().uuid(),
  alsoReport: z.boolean().default(false),
});
