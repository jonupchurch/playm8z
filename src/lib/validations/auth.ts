import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

// Letters+digits only, must start with a letter, max 24 chars (FR-003).
// Shared between the Credentials sign-up form, the Google-onboarding
// handle fallback, and the check-handle availability endpoint.
export const handleSchema = z
  .string()
  .regex(
    /^[a-zA-Z][a-zA-Z0-9]{0,23}$/,
    "Handle must start with a letter and contain only letters and numbers (max 24 characters).",
  );

export const registerSchema = credentialsSchema.extend({
  handle: handleSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
