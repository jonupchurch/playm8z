import { z } from "zod";
import { REGIONS } from "@/lib/validations/browse-filters";
import { credentialsSchema } from "@/lib/validations/auth";

// Server-side boundary for every Server Action under /profile
// (Principle II).
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(50),
  region: z.enum(REGIONS),
  bio: z.string().trim().max(300).optional(),
});

export const userGameSchema = z.object({
  game: z.string().trim().min(1).max(100),
  rank: z.string().trim().max(50).optional(),
  hoursPlayed: z.coerce.number().int().min(0).max(100000).optional(),
});

// currentPassword's correctness is checked against the stored hash in
// change-password.ts, not a shape rule here -- only newPassword reuses
// credentialsSchema's minimum-length rule.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: credentialsSchema.shape.password,
});

export const updateEmailSchema = z.object({
  email: credentialsSchema.shape.email,
});

export const privacyKeySchema = z.enum([
  "privacyShowAge",
  "privacyShowRegion",
  "privacyShowOnline",
  "privacyDiscoverable",
]);

export type PrivacyKey = z.infer<typeof privacyKeySchema>;
