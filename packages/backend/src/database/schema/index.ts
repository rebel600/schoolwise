export * from "./schools";
export * from "./users";
export * from "./students";

import { students } from "./students";
import { schoolMemberships } from "./users";

/**
 * Every table carrying `school_id`, and therefore requiring:
 *   - a tenant-scoped repository
 *   - an RLS policy
 *   - cross-tenant isolation tests
 *
 * `schools` is absent because it IS the tenant. `users` is absent because
 * identity is global — see docs/06-multi-tenancy.md.
 *
 * The schema conformance test walks this list. Adding a tenant table without
 * registering it here is caught there.
 */
export const TENANT_TABLES = [schoolMemberships, students] as const;

/** Tables deliberately NOT tenant-scoped. Anything else must be justified. */
export const GLOBAL_TABLE_NAMES = ["schools", "users"] as const;
