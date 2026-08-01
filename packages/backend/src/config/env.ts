import { z } from "zod";

/**
 * Environment schema.
 *
 * Validated once at startup and failing loudly. A missing JWT secret should
 * stop the process, not surface as an authentication bug in production.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  /**
   * The application connects as a NON-OWNING role without BYPASSRLS, so
   * Row-Level Security actually applies. See docs/06-multi-tenancy.md.
   */
  DATABASE_URL: z.string().url(),

  /** Migrations run as the schema owner — a different role. */
  DATABASE_MIGRATION_URL: z.string().url().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  CORS_ORIGINS: z
    .string()
    .default("http://localhost:9000")
    .transform((v) => v.split(",").map((s) => s.trim())),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nSee .env.example.`,
    );
  }

  return result.data;
}
