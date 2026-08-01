import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schema/index.ts",
  out: "./src/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env["DATABASE_MIGRATION_URL"] ??
      process.env["DATABASE_URL"] ??
      "postgresql://postgres:postgres@localhost:5432/schoolwise",
  },
  verbose: true,
  strict: true,
});
