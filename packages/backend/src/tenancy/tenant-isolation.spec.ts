import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { schools, students, users } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../testing/test-database";

import { withTenantSession } from "./tenant-session";

/**
 * The test suite that gates every business module.
 *
 * Assertions check for EMPTY RESULTS, not errors. An error would suggest the
 * row was located and then rejected; the requirement is that another school's
 * data is never visible in the first place.
 *
 * See docs/06-multi-tenancy.md — "Enforcement".
 */
describe("tenant isolation", () => {
  let harness: TestDatabase;
  let schoolA: string;
  let schoolB: string;

  beforeAll(async () => {
    harness = await createTestDatabase();
    const { db } = harness;

    const [a] = await db
      .insert(schools)
      .values({ slug: "school-a", name: "School A" })
      .returning();
    const [b] = await db
      .insert(schools)
      .values({ slug: "school-b", name: "School B" })
      .returning();

    if (!a || !b) throw new Error("Seeding failed");
    schoolA = a.id;
    schoolB = b.id;

    await db.insert(students).values([
      {
        schoolId: schoolA,
        admissionNumber: "A-001",
        firstName: "Asha",
        lastName: "Rao",
      },
      {
        schoolId: schoolA,
        admissionNumber: "A-002",
        firstName: "Vikram",
        lastName: "Singh",
      },
      {
        schoolId: schoolB,
        admissionNumber: "B-001",
        firstName: "Meera",
        lastName: "Nair",
      },
    ]);
  });

  afterAll(async () => {
    await harness.close();
  });

  /**
   * `db.execute()` resolves to `{ rows, fields, affectedRows }`, not an
   * iterable. Treating it as iterable yields an empty array, which would make
   * every schema-conformance assertion pass vacuously.
   */
  async function queryRows<T>(statement: ReturnType<typeof sql>): Promise<T[]> {
    const result = await harness.db.execute(statement);
    return (result as unknown as { rows: T[] }).rows;
  }

  async function policyTableNames(): Promise<Set<string>> {
    const rows = await queryRows<{ tablename: string }>(
      sql`SELECT tablename FROM pg_policies`,
    );
    return new Set(rows.map((r) => r.tablename));
  }

  describe("layer 3 — Row-Level Security", () => {
    it("returns only the bound tenant's rows for an unscoped SELECT", async () => {
      const rows = await harness.asAppRole((db) =>
        withTenantSession(db, schoolA, async (tx) =>
          tx.select().from(students),
        ),
      );

      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.schoolId === schoolA)).toBe(true);
    });

    it("hides another tenant's rows even when queried by primary key", async () => {
      const [target] = await harness.db
        .select()
        .from(students)
        .where(eq(students.admissionNumber, "B-001"));

      expect(target).toBeDefined();

      const rows = await harness.asAppRole((db) =>
        withTenantSession(db, schoolA, async (tx) =>
          tx.select().from(students).where(eq(students.id, target!.id)),
        ),
      );

      /* Empty, not an error. */
      expect(rows).toEqual([]);
    });

    it("returns zero rows when no tenant context is set, rather than every row", async () => {
      const rows = await harness.asAppRole(async (db) =>
        db.select().from(students),
      );

      expect(rows).toEqual([]);
    });

    it("blocks INSERT into another tenant via WITH CHECK", async () => {
      await expect(
        harness.asAppRole((db) =>
          withTenantSession(db, schoolA, async (tx) =>
            tx.insert(students).values({
              schoolId: schoolB,
              admissionNumber: "SMUGGLED",
              firstName: "Should",
              lastName: "Fail",
            }),
          ),
        ),
      ).rejects.toThrow();
    });

    it("does not let an UPDATE move a row into another tenant", async () => {
      await expect(
        harness.asAppRole((db) =>
          withTenantSession(db, schoolA, async (tx) =>
            tx
              .update(students)
              .set({ schoolId: schoolB })
              .where(eq(students.admissionNumber, "A-001")),
          ),
        ),
      ).rejects.toThrow();
    });

    it("cannot DELETE another tenant's rows", async () => {
      await harness.asAppRole((db) =>
        withTenantSession(db, schoolA, async (tx) =>
          tx.delete(students).where(eq(students.admissionNumber, "B-001")),
        ),
      );

      const survivors = await harness.db
        .select()
        .from(students)
        .where(eq(students.admissionNumber, "B-001"));

      expect(survivors).toHaveLength(1);
    });
  });

  describe("transaction scoping", () => {
    it("does not leak the tenant setting past the transaction", async () => {
      await harness.asAppRole((db) =>
        withTenantSession(db, schoolA, async (tx) =>
          tx.select().from(students),
        ),
      );

      /*
       * SET LOCAL is released at transaction end. If this were a plain SET,
       * the pooled connection would carry School A's tenant into the next
       * request that borrowed it.
       */
      const rows = await harness.asAppRole(async (db) =>
        db.select().from(students),
      );

      expect(rows).toEqual([]);
    });
  });

  describe("per-school uniqueness", () => {
    it("allows the same admission number in two different schools", async () => {
      await expect(
        harness.db.insert(students).values({
          schoolId: schoolB,
          admissionNumber: "A-001",
          firstName: "Same",
          lastName: "Number",
        }),
      ).resolves.toBeDefined();
    });

    it("still rejects a duplicate admission number within one school", async () => {
      await expect(
        harness.db.insert(students).values({
          schoolId: schoolA,
          admissionNumber: "A-002",
          firstName: "Duplicate",
          lastName: "Within",
        }),
      ).rejects.toThrow();
    });
  });

  describe("schema conformance", () => {
    it("has an RLS policy on every tenant table", async () => {
      const covered = await policyTableNames();

      for (const table of ["school_memberships", "students"]) {
        expect(covered.has(table)).toBe(true);
      }
    });

    it("forces RLS so the table owner cannot bypass it", async () => {
      const rows = await queryRows<{
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(
        sql`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
            WHERE relname IN ('students', 'school_memberships')`,
      );

      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.relrowsecurity).toBe(true);
        /* Without FORCE, the table owner bypasses the policy entirely. */
        expect(row.relforcerowsecurity).toBe(true);
      }
    });

    it("keeps global tables out of the tenant policy set", async () => {
      const covered = await policyTableNames();

      /* schools IS the tenant; users is global identity. */
      expect(covered.has("schools")).toBe(false);
      expect(covered.has("users")).toBe(false);
    });
  });

  describe("global identity", () => {
    it("keeps user email globally unique across schools", async () => {
      await harness.db.insert(users).values({
        email: "shared@example.com",
        passwordHash: "x",
        firstName: "Shared",
        lastName: "Identity",
      });

      await expect(
        harness.db.insert(users).values({
          email: "shared@example.com",
          passwordHash: "y",
          firstName: "Duplicate",
          lastName: "Identity",
        }),
      ).rejects.toThrow();
    });
  });
});
