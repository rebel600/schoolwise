import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

/**
 * Driver-agnostic database handle.
 *
 * Typed against `PgDatabase` rather than a concrete driver so the same
 * repositories run against `postgres-js` in production and PGlite in tests.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export const DATABASE = Symbol("DATABASE");
