-- ===========================================================================
-- Remove Row-Level Security from school_memberships.
--
-- WHY: school_memberships answers "which schools does this user belong to?"
-- That question is inherently PRE-TENANT — login must answer it in order to
-- discover which school to bind the session to. With a tenant_isolation
-- policy in place, the lookup ran with no tenant set, matched nothing, and
-- every login failed with "Invalid email or password."
--
-- The table therefore belongs to the same category as users, sessions, and
-- refresh_tokens: authentication infrastructure, which must be readable
-- before a tenant context can exist. Layer 3 cannot protect a table that has
-- to be queried before the tenant is known.
--
-- WHAT REPLACES IT: layer 2. Every ADMINISTRATIVE access to memberships
-- ("list the teachers at my school") must go through a repository extending
-- TenantRepository, which composes school_id into the query. Only the auth
-- module reads this table un-scoped, and only by user_id.
--
-- This is a deliberate, documented exception — not an oversight. See
-- docs/06-multi-tenancy.md, "Tables that cannot carry RLS".
-- ===========================================================================

DROP POLICY IF EXISTS tenant_isolation ON "school_memberships";--> statement-breakpoint
ALTER TABLE "school_memberships" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "school_memberships" DISABLE ROW LEVEL SECURITY;
