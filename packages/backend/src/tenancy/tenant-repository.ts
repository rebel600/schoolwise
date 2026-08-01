import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import type { Database } from "../database/database.types";

import type { TenantContext } from "./tenant-context";

/**
 * The minimum shape a table must have to be tenant-scoped.
 *
 * `deletedAt` is part of the contract because soft-delete filtering has the
 * same failure mode as tenant filtering: forget it once and the bug is
 * invisible until someone notices deleted records in a list.
 */
export type TenantTable = PgTable & {
  schoolId: PgColumn;
  deletedAt: PgColumn;
};

/**
 * Base class for every repository touching a tenant table.
 *
 * There is no un-scoped entry point, by construction. A repository that
 * builds its own `where` clause without `scoped()` / `scopedBy()` is a defect
 * regardless of whether it currently leaks — the next person to copy it will.
 *
 * See docs/06-multi-tenancy.md — "Layer 2".
 */
export abstract class TenantRepository<TTable extends TenantTable> {
  protected constructor(
    protected readonly db: Database,
    protected readonly table: TTable,
    protected readonly tenant: TenantContext,
  ) {}

  /** The tenant predicate plus the soft-delete filter. Every read starts here. */
  protected scoped(): SQL {
    return and(
      eq(this.table.schoolId, this.tenant.schoolId),
      isNull(this.table.deletedAt),
    ) as SQL;
  }

  /** The tenant predicate combined with caller-supplied conditions. */
  protected scopedBy(...conditions: (SQL | undefined)[]): SQL {
    return and(this.scoped(), ...conditions) as SQL;
  }

  /**
   * Reads that must include soft-deleted rows — restore flows, audit views.
   * Still tenant-scoped; only the soft-delete filter is dropped.
   */
  protected scopedIncludingDeleted(): SQL {
    return eq(this.table.schoolId, this.tenant.schoolId);
  }

  /**
   * Applies school_id to an insert. The caller never supplies it — that is
   * what keeps a client-controlled value out of a write.
   */
  protected withTenant<T extends Record<string, unknown>>(
    values: T,
  ): T & { schoolId: string } {
    return { ...values, schoolId: this.tenant.schoolId };
  }

  /**
   * Scopes a JOINED table to the current tenant.
   *
   * Foreign key integrity does not imply tenant integrity: a row whose
   * foreign key points across tenants still satisfies the constraint. Every
   * joined tenant table must be scoped explicitly, not just the primary one.
   */
  protected scopedJoin(
    joined: TenantTable,
    ...conditions: (SQL | undefined)[]
  ): SQL {
    return and(eq(joined.schoolId, this.tenant.schoolId), ...conditions) as SQL;
  }
}
