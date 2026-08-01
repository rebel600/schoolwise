import { sql } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { schools } from "./schools";
import { users } from "./users";

/**
 * A tenant table, and the reference example for every table added later.
 *
 * Note the four things that make it tenant-safe:
 *   1. school_id NOT NULL, onDelete: restrict
 *   2. the unique constraint is scoped by school_id, not global
 *   3. every filtering index leads with school_id
 *   4. an RLS policy, created in the same migration
 *
 * See the checklist at the end of docs/06-multi-tenancy.md.
 */
export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),

    /** Optional — a student record may exist before a login is issued. */
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "restrict",
    }),

    admissionNumber: varchar("admission_number", { length: 32 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    dateOfBirth: date("date_of_birth"),

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
     * Unique PER SCHOOL. A global constraint would let School A's admission
     * numbers block School B's enrolment — and leak, through the constraint
     * violation, that School A's data exists.
     *
     * Partial on deleted_at, so a soft-deleted record releases its number.
     */
    uniqueIndex("students_school_admission_uq")
      .on(t.schoolId, t.admissionNumber)
      .where(sql`deleted_at IS NULL`),

    index("students_school_active_idx").on(t.schoolId, t.deletedAt),
    index("students_school_lastname_idx").on(t.schoolId, t.lastName),
  ],
);

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
