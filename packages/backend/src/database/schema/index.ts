export * from "./schools";
export * from "./users";
export * from "./students";
export * from "./sessions";

import { students } from "./students";

/**
 * Every table carrying `school_id`, and therefore requiring:
 *   - a tenant-scoped repository
 *   - an RLS policy
 *   - cross-tenant isolation tests
 *
 * The schema conformance test walks this list. Adding a tenant table without
 * registering it here is caught there.
 */
export const TENANT_TABLES = [students] as const;

/**
 * Tables deliberately NOT tenant-scoped. Anything else must be justified
 * here, because "it has a school_id column but no policy" is otherwise
 * indistinguishable from an oversight.
 *
 *   schools   — IS the tenant. It cannot be scoped by itself.
 *
 *   users     — global identity. Email is globally unique because identity
 *               precedes membership, and one person may belong to several
 *               schools.
 *
 *   school_   — authentication infrastructure. Answering "which schools does
 *   memberships this user belong to?" is inherently PRE-TENANT: login must
 *               answer it to discover which school to bind the session to.
 *               An RLS policy here made every login fail, because the lookup
 *               ran before any tenant existed. Administrative access MUST
 *               still go through a TenantRepository — layer 2 replaces the
 *               layer 3 that cannot apply.
 *
 *   sessions  — authentication infrastructure. It carries `school_id` as
 *   refresh_    DATA (the tenant this session is bound to), but it must not
 *   tokens      carry an RLS POLICY: both are read during login and refresh,
 *               which happen BEFORE any tenant context exists. A policy here
 *               would make the refresh flow unable to find the very session
 *               it needs to authenticate, breaking login rather than
 *               securing it.
 *
 *               Their isolation comes from a different mechanism: a session
 *               is reachable only by presenting its opaque refresh token, and
 *               every access is scoped by session id or user id.
 */
export const GLOBAL_TABLE_NAMES = [
  "schools",
  "users",
  "school_memberships",
  "sessions",
  "refresh_tokens",
] as const;
