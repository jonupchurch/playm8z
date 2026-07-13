import { z } from "zod";

// Server-side boundary for Listing detail's four Server Actions
// (Principle II) -- apply-to-posting.ts, ask-question.ts,
// reply-to-question.ts each validate through one of these.
export const applyMessageSchema = z.object({
  message: z.string().trim().max(500).optional(),
});

export const questionTextSchema = z.object({
  text: z.string().trim().min(1).max(300),
});

export const replyTextSchema = z.object({
  reply: z.string().trim().min(1).max(500),
});
