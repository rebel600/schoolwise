import { z } from "zod";

/**
 * Login request.
 *
 * `schoolId` is present ONLY here, and only as a disambiguator for a user who
 * belongs to several schools. It selects which membership to open a session
 * against, and is validated against that user's own memberships — it cannot
 * reach another user's tenant.
 *
 * No OTHER request schema in the system accepts schoolId. After login the
 * tenant comes from the verified token. See docs/06-multi-tenancy.md.
 */
export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256),
  schoolId: z.string().uuid().optional(),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().email().max(320),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1).max(256),
  /*
   * 12 characters minimum, no composition rules. NIST 800-63B: length
   * beats forced symbol classes, which mostly produce Password1! and a
   * sticky note.
   */
  password: z.string().min(12).max(256),
});

export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordReset = z.infer<typeof confirmPasswordResetSchema>;
