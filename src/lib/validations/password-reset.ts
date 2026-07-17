import { z } from "zod";
import { credentialsSchema } from "@/lib/validations/auth";

// Both entry points are PUBLIC and unauthenticated -- the widest trust
// boundary in the app (Principle II). Neither has a session to lean on.

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type RequestPasswordResetInput = z.input<typeof requestPasswordResetSchema>;

export const completePasswordResetSchema = z.object({
  token: z.string().trim().min(1),
  // FR-015: DERIVED from sign-up's rule, never a restated `min(8)`.
  // Two copies of a password policy don't stay equal -- someone raises the
  // minimum at sign-up, reset silently keeps accepting the old one, and
  // the weaker door is the one nobody looks at. Reaching through
  // `.shape` means there is exactly one definition and this file cannot
  // drift from it.
  password: credentialsSchema.shape.password,
});
export type CompletePasswordResetInput = z.input<typeof completePasswordResetSchema>;
