import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Applies migrations, in order, inside a single transaction.
 *
 * Run as the schema OWNER, never as the application role: the application
 * connects as a non-owning role precisely so Row-Level Security applies to
 * it, and a role that can create tables can also drop policies.
 *
 * `DATABASE_MIGRATION_URL` therefore takes precedence over `DATABASE_URL`.
 */
const MIGRATIONS_DIR = join(__dirname, "migrations");

const APPLIED_TABLE = "__schoolwise_migrations";

async function main(): Promise<void> {
  const url =
    process.env["DATABASE_MIGRATION_URL"] ?? process.env["DATABASE_URL"];

  if (!url) {
    throw new Error(
      "Set DATABASE_MIGRATION_URL (preferred) or DATABASE_URL before running migrations.",
    );
  }

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "${APPLIED_TABLE}" (
          name text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `),
    );

    const applied = await db.execute(
      sql.raw(`SELECT name FROM "${APPLIED_TABLE}"`),
    );
    const already = new Set(
      (applied as unknown as { name: string }[]).map((r) => r.name),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let count = 0;

    for (const file of files) {
      if (already.has(file)) continue;

      const statements = readFileSync(join(MIGRATIONS_DIR, file), "utf8")
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      /*
       * One transaction per migration file. A partially applied migration
       * would leave tables without their RLS policies — unprotected, and
       * silently so.
       */
      await db.transaction(async (tx) => {
        for (const statement of statements) {
          await tx.execute(sql.raw(statement));
        }
        await tx.execute(
          sql`INSERT INTO ${sql.identifier(APPLIED_TABLE)} (name) VALUES (${file})`,
        );
      });

      console.log(`applied ${file}`);
      count += 1;
    }

    console.log(
      count === 0
        ? "database already up to date"
        : `applied ${count} migration(s)`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
