# Multi-Tenancy

> Version: 1.0.0
> Project: SchoolWise
> Status: Specification — Version 1.0 requirement
> Decision: [ADR-0004](adr/0004-multi-tenancy-in-v1.md)

---

# Purpose

SchoolWise serves many schools from one deployment. A **tenant** is a school.

This document specifies how tenant isolation is implemented and enforced. It is not optional guidance — a single missing tenant predicate is a cross-school data breach, so the rules here are structural rather than advisory.

Read this before writing any query, cache key, or file path.

---

# The threat model

The failure being defended against is simple and severe:

> A user authenticated to School A reads, modifies, or deletes data belonging to School B.

Every mechanism below exists to make that outcome impossible by construction rather than by discipline. Developers forget predicates. Architecture should not depend on them remembering.

---

# Isolation model

SchoolWise uses **shared database, shared schema, row-level isolation**.

One PostgreSQL database. One schema. Every business table carries `school_id`. Isolation is enforced by query construction, backed by PostgreSQL Row-Level Security.

Alternatives and why they were not chosen are recorded in [ADR-0004](adr/0004-multi-tenancy-in-v1.md).

---

# Defense in depth

Three independent layers. Any one failing does not produce a leak.

```text
Layer 1   Tenant context        request-scoped, derived from the session
              ↓
Layer 2   Repository base       composes school_id into every query
              ↓
Layer 3   Row-Level Security    PostgreSQL rejects what escapes layer 2
              ↓
          Verification          integration tests assert cross-tenant reads are empty
```

Layer 2 is where correctness normally lives. Layer 3 is the backstop for the day someone bypasses it. Layer 1 guarantees neither can be fed attacker-controlled input.

---

# Layer 1 — Tenant context

## Where `schoolId` comes from

`schoolId` is bound to the **session** at login and carried in the access token.

It is read from exactly one place: the verified JWT.

```text
Login  →  resolve user's school  →  bind to session  →  embed in access token
                                                              ↓
Request  →  verify JWT  →  extract schoolId  →  request-scoped TenantContext
```

## Where it must never come from

**Never** derive `schoolId` from any of the following:

- A request body field
- A query string parameter
- A path parameter
- A custom header
- A cookie other than the verified session

Any of these is attacker-controlled. Accepting `schoolId` from a request body converts the entire tenancy model into a suggestion.

```ts
// PROHIBITED — client controls which school's data is touched
async createStudent(@Body() dto: CreateStudentDto) {
  return this.students.create(dto.schoolId, dto);
}

// REQUIRED — schoolId comes from the verified session
async createStudent(@Body() dto: CreateStudentDto) {
  return this.students.create(dto);   // repository reads TenantContext
}
```

`CreateStudentDto` must not contain a `schoolId` field at all. If the type makes it unrepresentable, the mistake cannot be made.

## Implementation

A request-scoped provider populated by the tenant middleware, after the JWT guard has verified the token:

```ts
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private _schoolId: string | null = null;

  bind(schoolId: string): void {
    if (this._schoolId !== null) {
      throw new Error("Tenant context is already bound for this request.");
    }
    this._schoolId = schoolId;
  }

  get schoolId(): string {
    if (this._schoolId === null) {
      // Fail closed. An unbound context must never mean "all tenants".
      throw new UnauthorizedException("Tenant context is not established.");
    }
    return this._schoolId;
  }
}
```

Two properties matter here:

- **Bind once.** Rebinding mid-request would let one request cross tenants.
- **Fail closed.** An unbound context throws. It must never fall back to "no filter", which is how a missing context becomes a full-table read.

---

# Layer 2 — Repository enforcement

## The base class

No repository writes its own `school_id` predicate. It inherits one.

```ts
export abstract class TenantRepository<TTable extends TenantTable> {
  constructor(
    protected readonly db: Database,
    protected readonly table: TTable,
    protected readonly tenant: TenantContext,
  ) {}

  /** Every read starts here. There is no un-scoped entry point. */
  protected scoped() {
    return eq(this.table.schoolId, this.tenant.schoolId);
  }

  protected scopedBy(...conditions: SQL[]) {
    return and(this.scoped(), ...conditions);
  }

  /** Every insert has school_id applied, never supplied by the caller. */
  protected withTenant<T extends object>(values: T) {
    return { ...values, schoolId: this.tenant.schoolId };
  }
}
```

Concrete repositories compose on top:

```ts
@Injectable({ scope: Scope.REQUEST })
export class StudentsRepository extends TenantRepository<typeof students> {
  async findByAdmissionNumber(admissionNumber: string) {
    return this.db
      .select()
      .from(students)
      .where(this.scopedBy(eq(students.admissionNumber, admissionNumber)))
      .limit(1);
  }
}
```

## The rule

> A repository method that queries a tenant table without going through `scoped()`, `scopedBy()`, or `withTenant()` is a defect, regardless of whether it currently leaks.

This is enforced in code review and by the ESLint rule described under _Enforcement_.

## Joins

A join is where tenant scoping is most often lost. Scope **every** table in the join, not only the primary one:

```ts
// WRONG — enrollments is scoped, classes is not
.from(enrollments)
.innerJoin(classes, eq(enrollments.classId, classes.id))
.where(this.scoped())

// RIGHT — both sides scoped
.from(enrollments)
.innerJoin(
  classes,
  and(
    eq(enrollments.classId, classes.id),
    eq(classes.schoolId, this.tenant.schoolId),
  ),
)
.where(this.scoped())
```

Foreign key integrity does not imply tenant integrity. A misinserted row with a cross-tenant `classId` satisfies the constraint and leaks through the first form.

---

# Layer 3 — Row-Level Security

## Why a third layer

Layers 1 and 2 are application code. Application code has bugs. RLS is enforced by PostgreSQL and applies to raw SQL, migrations, ad-hoc `psql` sessions, and any future service that connects to the same database.

## Session variable

Each request runs inside a transaction that sets the tenant for the connection:

```sql
SET LOCAL app.current_school_id = '<uuid>';
```

`SET LOCAL` is transaction-scoped. It is released when the transaction ends, so a pooled connection cannot carry one request's tenant into the next. Plain `SET` would be a connection-pool-wide leak and must never be used.

## Policy

Applied to every tenant table:

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON students
  USING      (school_id = current_setting('app.current_school_id')::uuid)
  WITH CHECK (school_id = current_setting('app.current_school_id')::uuid);
```

- `USING` filters reads, updates, and deletes
- `WITH CHECK` blocks inserts and updates that would write a row into another tenant
- `FORCE ROW LEVEL SECURITY` applies the policy to the table owner as well — without it, the owning role bypasses the policy entirely and the layer does nothing

## Application database role

The application connects as a role that is **not** the table owner and does **not** have `BYPASSRLS`:

```sql
CREATE ROLE schoolwise_app LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO schoolwise_app;
-- deliberately NOT granted: BYPASSRLS, superuser, table ownership
```

Migrations run as a separate owner role. The application never runs migrations.

---

# Schema rules

## Every tenant table

```ts
export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),

    admissionNumber: varchar("admission_number", { length: 32 }).notNull(),
    // ...

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    // Unique PER SCHOOL, never globally
    admissionNumberPerSchool: uniqueIndex("students_school_admission_uq")
      .on(t.schoolId, t.admissionNumber)
      .where(sql`deleted_at IS NULL`),

    // school_id leads every filtered index
    schoolActiveIdx: index("students_school_active_idx").on(
      t.schoolId,
      t.deletedAt,
    ),
  }),
);
```

## Unique constraints

**Every** unique constraint on a tenant table is scoped by `school_id`.

A globally unique admission number means School B cannot enrol a student because School A already used that number — and it leaks the existence of School A's data through a constraint violation.

```sql
-- WRONG
UNIQUE (admission_number)

-- RIGHT
UNIQUE (school_id, admission_number)
```

The one deliberate exception is user email, discussed below.

## Indexes

`school_id` leads every index used for filtering. Every query carries a `school_id` predicate, so an index that does not lead with it cannot serve the query efficiently.

## Deletion

`onDelete: 'restrict'` on the `schools` reference. Cascading a school deletion across every table in the platform is not an operation that should be one statement away. School offboarding is a deliberate, audited, multi-step procedure.

---

# Cross-cutting concerns

## Caching

**Every cache key is tenant-prefixed.** An un-prefixed key serves one school's data to another.

```ts
// WRONG
`dashboard:stats``permissions:${userId}`
// RIGHT
`school:${schoolId}:dashboard:stats``school:${schoolId}:permissions:${userId}`;
```

A cache helper that takes `TenantContext` and builds the prefix is preferable to relying on convention.

## File storage

Object storage paths are tenant-prefixed, and signed URLs are validated against the requesting tenant:

```text
s3://schoolwise-uploads/{schoolId}/students/{studentId}/photo.jpg
```

Serving a file requires confirming the path's `schoolId` matches the session's. A signed URL alone is not authorization.

## Background jobs

A job runs outside a request and therefore has no ambient tenant context. **Every job payload carries `schoolId` explicitly**, and the worker binds a tenant context before touching the database.

A job that processes "all schools" iterates tenants and binds context per iteration. It never runs one un-scoped query across tenants.

## Audit logs

Audit records carry `school_id`. Audit queries are tenant-scoped like everything else. A school administrator sees their own school's audit trail and no other.

## Search

When Elasticsearch is introduced, `schoolId` is a mandatory filter clause on every query, applied by the search client rather than the caller — the same pattern as the repository base class.

---

# Users spanning schools

Most users belong to one school. Some do not: a `SUPER_ADMIN` operating the platform, or a teacher working at two schools under one identity.

The model separates identity from membership:

```text
users              identity and credentials — no school_id
school_memberships user ↔ school, with roles scoped to that membership
sessions           one row per authenticated device, bound to ONE membership
```

Consequences:

- User **email is globally unique**. This is the deliberate exception to per-school uniqueness, because identity precedes membership.
- Roles live on the membership, not the user. The same person may be a Teacher at School A and a Principal at School B.
- A session is bound to exactly one membership. Switching schools issues a **new session** with a new `schoolId` — it never mutates the current one.
- Workspace switching within one school (Principal → Teacher view) is a role change inside one membership and does not require a new session.

## The SUPER_ADMIN escape hatch

Platform operators sometimes need cross-tenant access. That path is explicit, narrow, and audited:

- It is a distinct repository method with `crossTenant` in its name, never a flag on a normal method
- It requires the `platform.cross_tenant_read` permission, which no school-level role grants
- It runs as a database role permitted to bypass RLS, used for nothing else
- Every invocation writes an audit record naming the operator, the tenant accessed, and the justification
- It is read-only. Cross-tenant writes have no legitimate use case.

---

# Enforcement

Rules that depend on memory decay. These are mechanical:

**ESLint — no raw tenant table access.** A custom rule flags `db.select().from(<tenantTable>)` outside a class extending `TenantRepository`.

**Schema test — every tenant table is complete.** A test enumerates Drizzle tables and asserts each non-global table has `school_id NOT NULL`, an RLS policy, and no unscoped unique constraint. New tables fail until compliant.

**Integration test — cross-tenant reads are empty.** For every repository, seed two schools, bind to School A, and assert School B's rows are invisible to `findAll`, `findById`, every finder, every join, and every aggregate. Assert **empty results, not errors** — an error would suggest the row was found and rejected.

**RLS test — the backstop works.** With RLS active, execute a deliberately unscoped raw query and assert PostgreSQL returns nothing. This test failing means layer 3 is not actually installed.

**Migration review.** Any migration touching a tenant table requires review against this document. New tables ship with their RLS policy in the same migration.

---

# Checklist for any new tenant table

- [ ] `school_id uuid NOT NULL` referencing `schools(id)` with `onDelete: 'restrict'`
- [ ] Every unique constraint scoped by `school_id`
- [ ] Every filtering index leads with `school_id`
- [ ] `ENABLE` and `FORCE ROW LEVEL SECURITY`, with a `tenant_isolation` policy carrying both `USING` and `WITH CHECK`
- [ ] Repository extends `TenantRepository`
- [ ] No DTO exposes `schoolId`
- [ ] All joins scope every joined tenant table
- [ ] Cache keys prefixed with `school:{schoolId}`
- [ ] Cross-tenant integration test present and passing
- [ ] Seed data creates at least two schools, so isolation bugs surface in development

---

# Related documentation

- [ADR-0004 — Multi-tenancy from the first migration](adr/0004-multi-tenancy-in-v1.md)
- [ADR-0005 — Self-hosted JWT authentication](adr/0005-self-hosted-jwt-authentication.md)
- [ADR-0006 — Drizzle ORM instead of Prisma](adr/0006-drizzle-over-prisma.md)
- [03-backend.md](03-backend.md)
- [00-status.md](00-status.md)
