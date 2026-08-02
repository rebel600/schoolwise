import { SetMetadata } from "@nestjs/common";

import type { Permission } from "./permissions";

export const PERMISSIONS_KEY = "permissions";

/**
 * Requires ALL listed permissions.
 *
 * Prefer this over @Roles(): endpoints should state what capability they
 * need, not which job titles happen to have it today.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
