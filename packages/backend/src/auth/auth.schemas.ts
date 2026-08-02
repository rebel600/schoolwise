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
