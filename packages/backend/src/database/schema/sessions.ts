import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { schools } from "./schools";
import { schoolMemberships, users } from "./users";

/**
 * One authenticated device.
 *
 * A session is bound to exactly ONE membership, which is what binds it to one
 * school. Switching schools issues a NEW session rather than mutating this
 * one — mutating it would let a single session span tenants.
 *
 * See docs/06-multi-tenancy.md — "Users spanning schools".
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    membershipId: uuid("membership_id")
      .notNull()
      .references(() => schoolMemberships.id, { onDelete: "restrict" }),

    /** Denormalized from the membership so token issuance needs no join. */
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),

    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    /** Set on logout, reuse detection, or administrative revocation. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: varchar("revoked_reason", { length: 64 }),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_school_idx").on(t.schoolId),
    index("sessions_expiry_idx").on(t.expiresAt),
  ],
);

/**
 * Refresh tokens, rotated on every use.
 *
 * Rows are never deleted on rotation — the used token is marked and kept, so
 * presenting it again is DETECTABLE. That detection is the primary defense
 * against a stolen refresh token: the thief and the legitimate client both
 * present the same value, and the second presentation revokes the whole
 * session family.
 *
 * See ADR-0005.
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),

    /**
     * SHA-256 of an opaque 256-bit random value. NEVER the raw token — a
     * database read must not yield usable credentials.
     */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    /** Set when rotated. A second use of a used token is theft. */
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("refresh_tokens_hash_uq").on(t.tokenHash),
    index("refresh_tokens_session_idx").on(t.sessionId),
    index("refresh_tokens_expiry_idx").on(t.expiresAt),
  ],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
