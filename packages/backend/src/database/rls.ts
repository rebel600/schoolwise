import { TENANT_SETTING } from "../tenancy/tenant-session";

/**
 * Row-Level Security policy SQL for tenant tables.
 *
 * This is layer 3: the backstop for the day someone bypasses the repository
 * base class. It is enforced by PostgreSQL itself, so it also applies to raw
 * SQL, ad-hoc psql sessions, and any future service on the same database.
 *
 * Generated rather than hand-written so a new tenant table cannot ship with a
 * subtly different policy.
 */

/** Role the application connects as. Deliberately not the table owner. */
export const APP_ROLE = "schoolwise_app";

/**
 * The tenant predicate shared by USING and WITH CHECK.
 *
 * `NULLIF` is load-bearing, and its absence is a real bug that integration
 * tests caught:
 *
 *   `current_setting(x, true)` returns NULL only while the parameter has
 *   NEVER been defined. Once any transaction has `SET LOCAL` it and ended,
 *   the session-level value becomes the EMPTY STRING — and `''::uuid` raises
 *   22P02 rather than matching nothing.
 *
 * On a pooled connection that means the second request to borrow it gets an
 * error instead of a clean empty result. `NULLIF` maps `''` back to NULL, so
 * an absent tenant yields zero rows — the fail-closed behaviour this layer
 * exists to guarantee.
 */
const TENANT_PREDICATE = `school_id = NULLIF(current_setting('${TENANT_SETTING}', true), '')::uuid`;

export function enableRlsSql(tableName: string): string {
  return `
-- ${tableName}: tenant isolation
ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;

-- FORCE applies the policy to the table OWNER too. Without it the owner
-- bypasses RLS entirely and this layer does nothing.
ALTER TABLE "${tableName}" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "${tableName}";

CREATE POLICY tenant_isolation ON "${tableName}"
  USING      (${TENANT_PREDICATE})
  WITH CHECK (${TENANT_PREDICATE});
`.trim();
}

export function grantsSql(tableNames: readonly string[]): string {
  const grants = tableNames
    .map(
      (t) => `GRANT SELECT, INSERT, UPDATE, DELETE ON "${t}" TO ${APP_ROLE};`,
    )
    .join("\n");

  return `
-- The application role owns no tables and has neither BYPASSRLS nor
-- superuser. Migrations run as a separate owning role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
    CREATE ROLE ${APP_ROLE} NOLOGIN;
  END IF;
END
$$;

${grants}
`.trim();
}
