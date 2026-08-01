import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { schools } from "./schools";

/**
 * Identity is separated from membership.
 *
 * A `users` row is a person. A `school_memberships` row is that person's
 * relationship with one school, carrying the roles that apply there.
 *
 * This is what lets the same person be a Teacher at School A and a Principal
 * at School B without duplicating their credentials.
 *
 * See docs/06-multi-tenancy.md — "Users spanning schools".
 */

export const userRole = pgEnum("user_role", [
  "SUPER_ADMIN",
  "ADMIN",
  "PRINCIPAL",
  "TEACHER",
  "STUDENT",
]);

export const userStatus = pgEnum("user_status", [
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
]);

/**
 * Global identity. Deliberately has NO school_id — identity precedes
 * membership, and the same person may belong to several schools.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * Globally unique. This is the one deliberate exception to per-school
     * uniqueness, and the reason `users` is not a tenant table.
     */
    email: varchar("email", { length: 320 }).notNull(),

    /** Argon2id. Never a plaintext or reversible value. */
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),

    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),

    status: userStatus("status").notNull().default("INVITED"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_email_uq")
      .on(t.email)
      .where(sql`deleted_at IS NULL`),
  ],
);

/**
 * A user's relationship with one school. THIS is the tenant-scoped table,
 * and where roles live.
 */
export const schoolMemberships = pgTable(
  "school_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    role: userRole("role").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    /** One membership per user per school — scoped by school_id, as required. */
    uniqueIndex("school_memberships_school_user_uq")
      .on(t.schoolId, t.userId)
      .where(sql`deleted_at IS NULL`),

    /** school_id leads every filtering index. */
    index("school_memberships_school_active_idx").on(t.schoolId, t.deletedAt),
    index("school_memberships_user_idx").on(t.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SchoolMembership = typeof schoolMemberships.$inferSelect;
export type NewSchoolMembership = typeof schoolMemberships.$inferInsert;
