import { sql } from "drizzle-orm";

import type { Database } from "../database/database.types";

/**
 * The PostgreSQL session variable RLS policies read.
 *
 * Must match the name used in `tenant_isolation` policies — see
 * src/database/rls.ts.
 */
export const TENANT_SETTING = "app.current_school_id";

/**
 * Runs `work` inside a transaction with the tenant session variable set, so
 * Row-Level Security policies apply.
 *
 * `SET LOCAL` is transaction-scoped and released when the transaction ends.
 * Plain `SET` would persist on the pooled connection and leak one request's
 * tenant into the next request that borrows it — a cross-tenant read with no
 * application-level bug to find. This distinction is the whole reason the
 * helper exists; never replace `SET LOCAL` with `SET`.
 *
 * See docs/06-multi-tenancy.md — "Layer 3".
 */
export async function withTenantSession<T>(
  db: Database,
  schoolId: string,
  work: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    /*
     * set_config($1, $2, true) is the parameterizable equivalent of
     * `SET LOCAL`. `SET LOCAL` itself does not accept bind parameters, which
     * would force string interpolation of a value into SQL.
     */
    await tx.execute(
      sql`SELECT set_config(${TENANT_SETTING}, ${schoolId}, true)`,
    );

    return work(tx as Database);
  });
}
