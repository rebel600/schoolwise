# ADR-0004 — Multi-tenancy from the first migration

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

The original roadmap listed _Multi-Tenant Architecture_ as explicitly out of scope for Version 1.0, deferred to a later release.

That conflicted with two other statements in the same documentation set:

- The product vision targets "thousands of educational institutions"
- The specified JWT payload already carries `schoolId`

Retrofitting tenancy into a live single-tenant system is one of the most expensive migrations a platform can undertake. It requires:

1. Adding a tenant column to every table and backfilling it
2. Rebuilding every unique constraint and index to be tenant-scoped
3. Auditing **every existing query** for missing tenant predicates — each omission is a cross-tenant data leak
4. Migrating production data with no ability to distinguish tenants after the fact
5. Reworking authentication, sessions, and every cached key

Step 3 is the dangerous one. It is unbounded work with a security incident at the end of any missed case, and no test suite reliably proves completeness.

## Decision

**Multi-tenancy is a Version 1.0 requirement.** The first migration is tenant-aware.

Design:

- A `schools` table is the tenant root
- Every business table carries `school_id uuid NOT NULL REFERENCES schools(id)`
- Every unique constraint is scoped by `school_id` — for example admission numbers are unique _per school_, not globally
- Every index intended for filtered queries leads with `school_id`
- **PostgreSQL Row-Level Security** is enabled on every tenant table as a defense-in-depth backstop
- The application sets a per-request tenant context; the repository layer derives `school_id` from that context and never from client input
- A `SUPER_ADMIN` role may operate across tenants through an explicit, audited escape hatch — never by default

Tenant isolation is enforced at three independent layers: the repository base class, RLS policies, and integration tests that assert cross-tenant reads return empty.

## Alternatives Considered

**Single-tenant for v1, as originally documented.** Ships marginally faster. Rejected: the cost curve is exponential in time, and the failure mode is a data breach rather than a bug.

**Database-per-tenant.** Strongest isolation, simplest queries. Rejected: migrations must run across N databases, connection pooling becomes a constraint at scale, and cross-tenant reporting requires a separate pipeline. Reconsider only for enterprise customers with contractual isolation requirements.

**Schema-per-tenant.** Middle ground. Rejected: PostgreSQL degrades with thousands of schemas, and migration tooling handles it poorly.

## Consequences

- Roughly two to three days of additional foundation work in Phase 3.
- Every repository method takes tenant context. There is no un-scoped query path, by construction.
- Every cache key is tenant-prefixed. An un-prefixed key is a cross-tenant leak.
- RLS adds a small per-query planning cost, accepted as the price of a backstop that catches application-layer mistakes.
- Tenant-aware seeding and test fixtures are required from the start.
- Version 2.0 features — white-label branding, per-school configuration, tenant-level reporting — become configuration rather than migration.

See [docs/06-multi-tenancy.md](../06-multi-tenancy.md) for the implementation specification.
