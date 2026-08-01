import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";

import type { Database } from "../database/database.types";
import * as schema from "../database/schema";

/*
 * Resolved relative to this file rather than process.cwd(), so the harness
 * works regardless of which directory the runner was launched from.
 *
 * `__dirname` rather than `import.meta`: this package emits CommonJS via
 * `nest build`, and TypeScript rejects `import.meta` in a CommonJS target
 * even behind a runtime guard.
 */
const MIGRATIONS_DIR = join(__dirname, "../database/migrations");

/**
 * A real PostgreSQL instance for tests, compiled to WASM.
 *
 * PGlite is chosen over a Docker service specifically because tenant
 * isolation must be verified on EVERY run — including CI and a laptop with no
 * daemon. An isolation test that gets skipped when infrastructure is missing
 * is worse than no test: it reports green while proving nothing.
 *
 * The migrations are applied as written, so the RLS policies under test are
 * the same statements that reach production.
 */
export interface TestDatabase {
  db: Database;
  /** Runs `work` with RLS active as the non-superuser application role. */
  asAppRole<T>(work: (db: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;

  await applyMigrations(db);
  await createApplicationRole(db);

  return {
    db,

    /**
     * PGlite's default user is a superuser, and superusers bypass RLS
     * regardless of FORCE. Switching to a non-superuser role is what makes
     * the policies actually apply — without this, every RLS test would pass
     * vacuously.
     */
    async asAppRole<T>(work: (d: Database) => Promise<T>): Promise<T> {
      await db.execute(sql`SET ROLE schoolwise_app`);
      try {
        return await work(db);
      } finally {
        await db.execute(sql`RESET ROLE`);
      }
    },

    async close() {
      await client.close();
    },
  };
}

async function applyMigrations(db: Database): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    throw new Error(
      `No migrations found in ${MIGRATIONS_DIR}. Tests would run against an empty schema and pass vacuously.`,
    );
  }

  for (const file of files) {
    const contents = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

    for (const statement of contents.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed.length > 0) {
        await db.execute(sql.raw(trimmed));
      }
    }
  }
}

async function createApplicationRole(db: Database): Promise<void> {
  await db.execute(
    sql.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'schoolwise_app') THEN
          CREATE ROLE schoolwise_app NOLOGIN;
        END IF;
      END
      $$;
    `),
  );

  /*
   * Deliberately no BYPASSRLS, no superuser, no table ownership.
   *
   * One statement per call — PGlite uses the extended query protocol, which
   * rejects multiple commands in a single prepared statement.
   */
  await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO schoolwise_app`));
  await db.execute(
    sql.raw(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO schoolwise_app`,
    ),
  );
}
