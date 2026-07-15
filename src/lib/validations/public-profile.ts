import { z } from "zod";

// Server-side boundary for toggle-follow.ts (Principle II). Self-follow
// rejection happens in the action itself (needs the acting user's own
// id, not available inside a stateless Zod schema) -- same convention
// as block-user.ts's own self-block check.
export const toggleFollowSchema = z.object({
  followeeId: z.string().uuid(),
});
export type ToggleFollowInput = z.infer<typeof toggleFollowSchema>;

// Server-side boundary for invite-to-party.ts. Eligibility (the acting
// user currently hosts `postingId`, it's `open`, and has
// `seatsOpen > 0`) is checked via a DB query in the action, not here --
// same reasoning as apply-to-posting.ts's own host/capacity checks.
export const inviteToPartySchema = z.object({
  postingId: z.string().uuid(),
  invitedUserId: z.string().uuid(),
});
export type InviteToPartyInput = z.infer<typeof inviteToPartySchema>;
