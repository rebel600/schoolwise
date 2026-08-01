# ADR-0007 — NestJS modular monolith

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

The backend serves a frontend already split into independently deployed micro frontends ([ADR-0001](0001-single-spa-micro-frontends.md)). A reasonable instinct is to mirror that split on the backend with a service per domain.

That instinct is wrong at this stage. The frontend split buys independent _deployment_ of UI. A backend split buys independent deployment of services at the cost of service discovery, network latency between what were function calls, distributed transactions, eventual consistency, and per-service operational overhead — before a single school is onboarded.

## Decision

**A single NestJS application composed of isolated domain modules.**

Rules that keep future extraction viable:

- Each module owns its controllers, services, repositories, DTOs, and schema
- Modules communicate through **exported services only** — never by importing another module's repository or reaching into its tables
- Cross-module data access goes through the owning module's public service interface
- Domain events are emitted through an internal event bus, so extraction later means swapping the transport rather than rewriting call sites
- Each module's schema lives in its own file under `database/schema/`, making its table ownership explicit

The layering is Controller → Service → Repository → Database, with no layer skipping.

## Alternatives Considered

**Microservices from the start.** Rejected: operational cost with no corresponding benefit at current scale. Distributed systems problems are real and permanent; the modular monolith defers them until scale justifies them.

**Hono or Fastify.** Materially faster and lighter. Rejected: the entire backend design — guards, interceptors, pipes, dependency injection, module encapsulation — is built on Nest's primitives. Tenant context propagation via request-scoped providers and RBAC via guards are exactly what Nest's DI container is for. Switching would mean rebuilding that infrastructure by hand.

## Consequences

- One deployment unit. A failure in any module can affect the whole process, mitigated by running multiple replicas behind health checks.
- Module boundaries are a convention, and conventions erode. Enforced by an ESLint rule that forbids deep imports across module directories, and by code review.
- Vertical scaling first. Horizontal scaling is available through stateless replicas, which requires sessions in PostgreSQL or Redis rather than in process memory — already the design.
- Nest's startup time and memory footprint exceed a minimal framework's. Acceptable for a long-running server; would matter for serverless, which is not the deployment target.
- Extraction candidates when scale demands it: notifications, reporting, analytics, file processing. Extraction should follow measured need, never architectural fashion.
