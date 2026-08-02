import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/** Restricts a route to the listed roles, within the caller's school. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
