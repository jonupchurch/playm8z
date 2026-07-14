import { z } from "zod";

// Server-side boundary for send-message.ts (Principle II, data-model.md).
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// Server-side boundary for start-conversation.ts. A single recipient
// starts/reuses a direct conversation; two or more starts a group.
export const startConversationSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(20),
  groupName: z.string().trim().max(60).optional(),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;

// Server-side boundary shared by accept-request.ts and decline-request.ts.
export const requestActionSchema = z.object({
  applicationId: z.string().uuid(),
});

export type RequestActionInput = z.infer<typeof requestActionSchema>;

// Server-side boundary for search-contacts.ts.
export const contactSearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
});
