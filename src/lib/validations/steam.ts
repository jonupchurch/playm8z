import { z } from "zod";

// The subset of Steam's OpenID `id_res` callback we assert BEFORE trusting
// anything. The full param set is still echoed back to Steam for the
// check_authentication verification (steam-openid.ts) -- this only gates the
// shape. `claimed_id` carries the SteamID64 (17 digits).
export const steamCallbackSchema = z.object({
  "openid.mode": z.literal("id_res"),
  "openid.claimed_id": z.string().regex(/^https:\/\/steamcommunity\.com\/openid\/id\/\d{17}$/),
  "openid.signed": z.string().min(1),
  "openid.sig": z.string().min(1),
});

// The games a player chose to import. Names are free text (ADR 0001);
// hoursPlayed comes from Steam playtime. Capped so a forged payload can't
// ask us to insert an unbounded batch.
export const importSelectionSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(100),
      hoursPlayed: z.number().int().min(0),
    }),
  )
  .max(2000);

export type ImportSelection = z.infer<typeof importSelectionSchema>;
