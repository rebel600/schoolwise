import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * The tenant root.
 *
 * This is the one business table with no `school_id` column — it *is* the
 * tenant identity. Every other business table references it.
 *
 * See docs/06-multi-tenancy.md.
 */
export const schools = pgTable(
  "schools",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** URL-safe identifier used for tenant-specific hosts and branding. */
    slug: varchar("slug", { length: 63 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),

    /** Per-school configuration and white-label branding. */
    settings: text("settings"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /**
     * Slug is globally unique — it identifies the tenant itself, so it cannot
     * be scoped by tenant. Partial, so a soft-deleted school releases its slug.
     */
    uniqueIndex("schools_slug_uq")
      .on(t.slug)
      .where(sql`deleted_at IS NULL`),
    index("schools_active_idx").on(t.deletedAt),
  ],
);

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
