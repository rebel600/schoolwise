# Backend Architecture

> Version: 2.0.0
> Project: SchoolWise
> Framework: NestJS + Express
> Architecture: Multi-tenant Modular Monolith
> Last Updated: 2026-08-02

---

> **None of this is implemented yet.** `packages/backend` does not exist. This document is the specification to build against. See [00-status.md](00-status.md).

---

# Purpose

This document defines the backend architecture of SchoolWise.

It establishes the architectural standards, module boundaries, communication patterns, and development principles that every backend contributor must follow.

The backend is designed to support millions of users while remaining maintainable, scalable, and secure.

---

# Backend Vision

SchoolWise follows a **Modular Monolith Architecture**.

Instead of starting with microservices, the system begins as a single NestJS application composed of isolated business modules.

Each module owns its own domain logic and communicates through clearly defined interfaces.

As the platform grows, modules can be extracted into independent services without requiring a complete rewrite.

---

# Why NestJS?

NestJS was selected because it provides:

- Modular architecture
- Excellent TypeScript support
- Dependency Injection
- Guards
- Pipes
- Interceptors
- Middleware
- Validation
- Authentication
- Authorization
- Logging
- Testing
- Strong ecosystem
- Enterprise-ready structure

NestJS aligns well with long-term maintainability.

---

# Why Modular Monolith?

Starting with microservices introduces operational complexity.

Examples:

- Service discovery
- Network latency
- Distributed transactions
- Event consistency
- Infrastructure overhead

A modular monolith provides:

- Simpler development
- Easier debugging
- Faster deployments
- Lower operational cost
- Strong domain separation

SchoolWise is intentionally designed so modules can become microservices in the future if necessary.

---

# Technology Stack

## Framework

- NestJS

---

## HTTP Adapter

- Express

---

## Language

- TypeScript

---

## Authentication

- JWT
- Refresh Tokens

---

## Authorization

- Role Based Access Control (RBAC)
- Permission Based Access Control

---

## Validation

- **Zod**

Schemas are defined once and shared with the frontend through `@school-wise/lib-types`. `drizzle-zod` derives base schemas from table definitions, so a column change surfaces as a type error rather than a runtime failure.

> Earlier drafts specified `class-validator` and `class-transformer`. These were replaced by Zod because decorator-based validation cannot be shared with the frontend, forcing every contract to be written twice and drift independently. Zod schemas are values — they cross the boundary.

---

## ORM

- **Drizzle ORM**

Chosen over Prisma because tenant isolation requires composing a mandatory predicate into every query and driving per-request PostgreSQL session variables for Row-Level Security. Drizzle's query builder makes both straightforward; Prisma's client makes both awkward.

Drizzle also ships no separate query engine binary, giving faster cold starts and a smaller container image.

See [ADR-0006](adr/0006-drizzle-over-prisma.md).

---

## Database

- **PostgreSQL 16+**

PostgreSQL specifically, not "a SQL database". The tenancy model depends on **Row-Level Security**, which MySQL and SQL Server do not provide equivalently. Portability to other engines is not a goal.

---

## Caching (Future)

- Redis

Every cache key is tenant-prefixed. See [06-multi-tenancy.md](06-multi-tenancy.md).

---

## Storage (Future)

- AWS S3 or compatible object storage

Object paths are tenant-prefixed and validated against the requesting session.

---

# Backend Architecture

```text
Browser

↓

React Micro Frontends

↓

REST APIs

↓

NestJS

↓

Modules

↓

Database
```

---

# Project Structure

```text
packages/backend/

src/

main.ts

app.module.ts

modules/

common/

config/

database/

core/

tenancy/

---

modules/

schools/          tenant registry and configuration

auth/

users/

students/

teachers/

principal/

administration/

attendance/

assignments/

subjects/

timetable/

results/

notifications/

dashboard/

monitoring/

audit/
```

---

# Directory Responsibilities

## modules/

Contains all business domains.

Each module owns:

- Controller
- Service
- DTOs
- Entities
- Repository
- Validation
- Tests

---

## common/

Contains reusable backend utilities.

Examples

- Exceptions
- Filters
- Pipes
- Guards
- Interceptors
- Decorators

---

## config/

Environment configuration.

Examples

- Database
- JWT
- Redis
- Mail
- Storage

---

## database/

Database configuration.

Responsibilities

- Drizzle client and connection pool
- `schema/` — one file per module, table ownership explicit
- `migrations/` — generated SQL, committed and reviewed
- `seeds/` — deterministic, and always creating **at least two schools**

Seeding two schools is deliberate: a tenant isolation bug is invisible in a single-tenant dataset.

---

## tenancy/

Tenant isolation infrastructure. Cross-cutting, so it sits outside `modules/`.

Contains

- `TenantContext` — request-scoped, bound from the verified session
- `TenantMiddleware` — binds the context and sets the RLS session variable
- `TenantRepository` — base class composing `school_id` into every query

No module implements its own tenant filtering. See [06-multi-tenancy.md](06-multi-tenancy.md).

---

## core/

Application-wide infrastructure.

Examples

- Logger
- Event bus
- Constants
- Base Classes

---

# Module Structure

Every module should follow a consistent structure.

Example

```text
students/

students.controller.ts

students.service.ts

students.module.ts

dto/

entities/

repositories/

interfaces/

validators/

tests/
```

---

# Module Responsibilities

Every module owns:

- Business Rules
- API Endpoints
- Validation
- Data Access
- Authorization
- Mapping

No module should access another module's database implementation directly.

Modules communicate through services or public interfaces.

---

# Core Modules

## Schools

The tenant root. Every other module's data belongs to a school.

Responsibilities

- School registry
- School configuration and settings
- Branding and white-label configuration
- Academic year definition
- Onboarding and offboarding

The `schools` table is the one business table with **no** `school_id` column — it is the tenant identity itself.

---

## Authentication

Responsibilities

- Login
- Logout
- Refresh Token
- Password Reset
- Session Validation
- Token Verification

---

## Users

Responsibilities

- User identity and credentials
- School memberships
- Roles and permissions, scoped to a membership
- Account Status
- Password Management

Identity is separated from membership. A `users` row is a person; a `school_memberships` row is that person's relationship with one school, carrying the roles that apply there.

Consequences:

- User email is **globally unique** — the one deliberate exception to per-school uniqueness, because identity precedes membership
- The same person can be a Teacher at one school and a Principal at another
- A session is bound to exactly one membership

---

## Students

Responsibilities

- Student Profiles
- Enrollment
- Academic Details
- Attendance Summary

---

## Teachers

Responsibilities

- Teacher Profiles
- Assigned Classes
- Assigned Subjects
- Performance

---

## Principal

Responsibilities

- School Reports
- Analytics
- Academic Monitoring

---

## Administration

Responsibilities

- Student CRUD
- Teacher CRUD
- Staff CRUD
- User Management
- School Configuration

---

## Attendance

Responsibilities

- Student Attendance
- Teacher Attendance
- Attendance Reports

---

## Assignments

Responsibilities

- Assignment Creation
- Submission
- Review
- Grading

---

## Subjects

Responsibilities

- Subject Management
- Subject Assignment

---

## Timetable

Responsibilities

- Timetable Generation
- Timetable Updates

---

## Results

Responsibilities

- Marks
- Exams
- Grades
- Result Publishing

---

## Notifications

Responsibilities

- In-App Notifications
- Email Notifications
- Future Push Notifications

---

## Dashboard

Responsibilities

- Aggregated Statistics
- KPIs
- Charts
- Reports

---

## Monitoring

Responsibilities

- API Metrics
- Health Checks
- System Performance
- Application Status

---

## Audit

Responsibilities

- Activity Logs
- Security Logs
- User Actions
- System Changes

---

# Dependency Rules

Modules must remain loosely coupled.

Allowed

```text
Student Module

↓

User Module
```

Allowed

```text
Attendance Module

↓

Student Module
```

Not Allowed

```text
Student Repository

↓

Teacher Repository
```

Repositories should never communicate directly across modules.

Communication must happen through services or public APIs.

---

# Clean Architecture

The backend follows Clean Architecture principles.

Layers

```text
Controller

↓

Service

↓

Repository

↓

Database
```

Responsibilities

Controller

- Request
- Response
- Validation

Service

- Business Logic

Repository

- Database Operations

Database

- Persistence

Each layer should have a single responsibility.

---

# SOLID Principles

Every backend module should follow:

- Single Responsibility
- Open/Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion

These principles improve maintainability and testability.

---

# Backend Design Checklist

Every new module should answer:

- Does this belong to an existing module?
- Does it introduce unnecessary coupling?
- Is validation implemented?
- Is authorization enforced?
- Is business logic isolated?
- Are DTOs defined?
- Are interfaces reusable?
- Can the module be tested independently?

Following this checklist ensures a consistent and scalable backend architecture across the entire SchoolWise platform.

---

# Authentication Architecture

SchoolWise follows a centralized authentication model.

Authentication is handled by the **Authentication Module**.

Every frontend application consumes the same authentication service.

No frontend application implements its own authentication logic.

---

# Authentication Flow

```text
User

↓

Login Request

↓

Authentication Controller

↓

Authentication Service

↓

Validate Credentials

↓

Generate JWT

↓

Generate Refresh Token

↓

Store Session

↓

Return Authentication Response
```

---

# Authentication Responsibilities

The Authentication Module is responsible for:

- Login
- Logout
- Refresh Token
- Password Reset
- Change Password
- Token Verification
- Session Validation
- User Session Management
- Login History (Future)
- Device Management (Future)

---

# JWT Strategy

Every authenticated request contains:

- Access Token
- Refresh Token

Access Token

Purpose

- Authentication
- Authorization

Recommended Lifetime

15–30 minutes

---

Refresh Token

Purpose

Generate a new Access Token without requiring the user to log in again.

Lifetime

30 days

## Refresh token rules

These are not recommendations.

- **Opaque, not a JWT.** A refresh token carries no claims. It is a random 256-bit value.
- **Stored hashed.** The database holds a SHA-256 hash. A database read must never yield usable credentials.
- **Rotated on every use.** Each refresh issues a new token and invalidates the old one.
- **Reuse detection.** Presenting an already-rotated token means the token was stolen — either by an attacker or from a legitimate client that lost the race. Revoke the **entire session family** and raise a security audit event. This is the primary defense against refresh token theft.
- **`httpOnly`, `Secure`, `SameSite=Strict` cookie.** JavaScript must not be able to read it.

---

# JWT Payload

Access token payload:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "schoolId": "school-id",
  "membershipId": "membership-id",
  "roles": ["ADMIN"],
  "permissions": ["student.read", "student.create"],
  "sessionId": "session-id",
  "iat": 1754136000,
  "exp": 1754136900
}
```

Avoid placing sensitive information in JWT payloads. A JWT is signed, not encrypted — anyone holding it can read every claim.

## `schoolId` is authoritative

`schoolId` is bound to the session at login and read **only** from the verified token.

It is never accepted from a request body, query string, path parameter, or header. Accepting it from a request lets any authenticated user address any school's data, which reduces the entire tenancy model to a suggestion.

## Permissions in the token

Embedding permissions avoids a database lookup per request, at the cost of staleness — a revoked permission remains valid until the access token expires.

The 15 minute access token lifetime bounds that window. Where immediate revocation matters — account suspension, membership removal — the session is revoked, and the next refresh fails.

---

# User Session

A session represents one authenticated device.

Each session should contain:

- Session ID
- User ID
- Device Information
- IP Address
- Login Time
- Last Activity
- Refresh Token
- Expiration

Future features:

- Remote logout
- Device management
- Session history

---

# Authorization

SchoolWise follows Backend-First Authorization.

The backend always decides whether a request is permitted.

The frontend reflects permissions for user experience only.

---

# RBAC (Role-Based Access Control)

Supported roles:

- Super Administrator
- Administrator
- Principal
- Teacher
- Student

Future roles:

- Parent
- Librarian
- Accountant
- Receptionist
- Transport Manager

---

# Permission-Based Access

Roles determine default permissions.

Permissions determine fine-grained access.

Example permissions:

```text
student.read
student.create
student.update
student.delete

teacher.read
teacher.create
teacher.update

attendance.read
attendance.update

assignment.review

dashboard.view

settings.manage
```

The backend validates permissions on every protected endpoint.

---

# Authorization Flow

```text
Incoming Request

↓

JWT Validation              JwtAuthGuard

↓

Tenant Binding              TenantMiddleware — binds schoolId, sets RLS variable

↓

Role Resolution             RolesGuard

↓

Permission Validation       PermissionsGuard

↓

Business Logic              school_id composed into every query

↓

Response
```

Tenant binding happens **after** JWT validation and **before** any business logic. An unauthenticated request has no tenant, and an unbound tenant context throws rather than defaulting to "all tenants".

---

# NestJS Guards

Authorization should use NestJS Guards.

| Guard              | Responsibility                                      |
| ------------------ | --------------------------------------------------- |
| `JwtAuthGuard`     | Verify signature and expiry, attach user to request |
| `RolesGuard`       | Validate the user's roles for this school           |
| `PermissionsGuard` | Validate fine-grained permissions                   |
| `TenantGuard`      | Assert a tenant context is bound                    |

Guards are registered **globally**, with an explicit `@Public()` decorator to opt out.

This ordering matters. Opt-in protection means a developer who forgets a decorator ships an unprotected endpoint, and nothing fails. Opt-out protection means the same mistake yields a 401 in the first test run. Default to secure; make the exception loud.

Controllers remain focused on business logic.

---

# REST API Standards

SchoolWise follows RESTful API design.

Resources should use nouns rather than verbs.

Good examples:

```text
GET    /students
GET    /students/{id}
POST   /students
PUT    /students/{id}
PATCH  /students/{id}
DELETE /students/{id}
```

Avoid endpoints such as:

```text
/getStudents
/createStudent
/updateAttendance
```

---

# API Versioning

Version APIs from day one.

Example:

```text
/api/v1/auth/login

/api/v1/students

/api/v1/teachers
```

Future versions:

```text
/api/v2/students
```

This avoids breaking existing clients.

---

# HTTP Status Codes

Use standard HTTP status codes.

Success

- 200 OK
- 201 Created
- 204 No Content

Client Errors

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity

Server Errors

- 500 Internal Server Error
- 503 Service Unavailable

Do not return HTTP 200 for failed requests.

---

# Standard API Response

Success response:

```json
{
  "success": true,
  "message": "Student created successfully.",
  "data": {},
  "timestamp": "2026-08-02T10:00:00Z"
}
```

Error response:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [],
  "timestamp": "2026-08-02T10:00:00Z"
}
```

Maintain a consistent response structure across all modules.

---

# DTO Strategy

Every request and response should use DTOs, defined as Zod schemas and shared with the frontend.

```ts
export const createStudentSchema = z.object({
  admissionNumber: z.string().min(1).max(32),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.coerce.date(),
  classId: z.string().uuid(),
  // NOTE: no schoolId — it comes from the session
});

export type CreateStudentRequest = z.infer<typeof createStudentSchema>;
```

Rules:

- Never expose database entities directly to API consumers
- **No request DTO contains `schoolId`.** If the type cannot express it, the mistake cannot be made.
- Response DTOs omit `schoolId` too — a client only ever sees its own school, so the field carries no information and leaks the identifier
- Response DTOs must omit `passwordHash`, `refreshTokenHash`, and `deletedAt`

---

# Validation

Validation uses **Zod**, applied by a global validation pipe.

Examples:

- Email validation
- Required fields
- Enum validation
- Date validation
- Numeric validation
- String length validation

Validation belongs at the API boundary.

Because the same schema is exported through `@school-wise/lib-types`, the frontend validates with identical rules. Frontend validation is for user experience; backend validation is for correctness. Neither substitutes for the other, but they no longer drift.

## Unknown keys are stripped

The validation pipe strips properties not present in the schema rather than passing them through. A client sending `{ name: "x", schoolId: "other-school" }` has `schoolId` removed before the service sees it — defense in depth behind the DTO rule above.

---

# Business Rules

Validation ensures data correctness.

Business rules enforce domain behavior.

Example:

Validation

- Email format is valid.

Business Rule

- Student cannot enroll twice in the same class.

Keep these concerns separate.

---

# Exception Handling

Use NestJS Exception Filters.

Common exceptions:

- ValidationException
- UnauthorizedException
- ForbiddenException
- NotFoundException
- ConflictException
- InternalServerException

Avoid exposing stack traces to API consumers.

---

# Global Exception Filter

The application should register a global exception filter.

Responsibilities:

- Format responses
- Hide internal implementation details
- Log unexpected errors
- Return consistent JSON responses

---

# Database Layer

Recommended architecture:

```text
Controller

↓

Service

↓

Repository          ← extends TenantRepository, school_id composed here

↓

Drizzle Client      ← transaction sets app.current_school_id

↓

PostgreSQL          ← Row-Level Security policies enforce isolation
```

Repositories are responsible only for data access.

Business rules belong in services.

**Every repository touching a tenant table extends `TenantRepository`.** A repository that builds its own `where` clause without the inherited tenant predicate is a defect regardless of whether it currently leaks — the next developer to copy it will leak.

---

# Transactions

Use database transactions when multiple operations must succeed together.

Examples:

- Student enrollment
- Fee payment
- Assignment submission
- Bulk imports

Transactions help maintain data consistency.

---

# Pagination

Every list endpoint should support pagination.

Recommended query parameters:

```text
?page=1
&pageSize=20
&sortBy=name
&sortOrder=asc
```

Response example:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 200,
  "totalPages": 10
}
```

Avoid returning unbounded datasets.

---

# Filtering

Endpoints should support filtering where appropriate.

Examples:

```text
GET /students?class=10

GET /teachers?subject=Math

GET /attendance?date=2026-08-02
```

Filtering should be implemented consistently.

---

# Searching

Support search parameters for user-facing resources.

Examples:

```text
GET /students?search=john

GET /teachers?search=smith
```

Search behavior should be documented for each endpoint.

---

# Sorting

Support sorting using query parameters.

Example:

```text
GET /students?sortBy=lastName&sortOrder=asc
```

Only allow sorting on approved fields to prevent inefficient queries.

---

# API Documentation

Generate interactive API documentation using Swagger.

Documentation should include:

- Endpoint description
- Request DTOs
- Response DTOs
- Authentication requirements
- Error responses
- Examples

Swagger should be available in non-production environments.

---

# Security Checklist

Every protected endpoint should verify:

- JWT validity
- User status (active/inactive)
- Role
- Permission
- Ownership (where applicable)

Security checks should occur before executing business logic.

---

# Backend API Principles

Every endpoint should:

- Validate input
- Authenticate the user
- Authorize the request
- Execute business logic
- Return a consistent response
- Log important events
- Handle exceptions gracefully

These principles establish a predictable and secure API surface for all SchoolWise applications.

---

# Logging Strategy

Logging is a critical part of the SchoolWise backend.

Every significant system event should be logged.

Logging should provide enough information to diagnose issues without exposing sensitive information.

---

## Log Levels

The application should support the following log levels.

- Debug
- Information
- Warning
- Error
- Critical

---

## What Should Be Logged

### Authentication

- Login Success
- Login Failure
- Logout
- Password Reset
- Password Change
- Token Refresh

---

### User Actions

- Student Created
- Student Updated
- Student Deleted
- Teacher Created
- Teacher Updated
- Attendance Submitted
- Assignment Published
- Results Published

---

### System Events

- Server Startup
- Server Shutdown
- Scheduled Jobs
- Database Migrations
- Cache Failures
- Third-party API Failures

---

### Errors

Every unexpected exception should be logged with:

- Timestamp
- Request Path
- User ID (if available)
- Request ID
- Error Message
- Stack Trace (Non-Production)
- Environment

Never expose stack traces to clients.

---

# Audit Logging

Audit logging is different from application logging.

Application logs help developers.

Audit logs help administrators.

---

## Audit Events

Examples:

- User Login
- User Logout
- Student Record Modified
- Teacher Record Modified
- Fee Updated
- Attendance Edited
- Timetable Changed
- Permission Changed
- User Deleted

---

## Audit Record

Recommended fields:

```text
Audit ID

Timestamp

User ID

Action

Module

Entity ID

Previous Value

New Value

IP Address

Device

Session ID
```

Audit records should never be deleted.

---

# Monitoring

The backend should expose operational metrics.

Examples:

- API Response Time
- CPU Usage
- Memory Usage
- Request Count
- Error Rate
- Active Sessions
- Queue Length
- Database Connections

---

# Health Checks

Provide health endpoints.

Example:

```text
GET /api/v1/health
```

Checks should include:

- Database
- Cache
- Queue
- Storage
- External Services

Future integrations:

- Kubernetes Readiness Probe
- Kubernetes Liveness Probe

---

# Caching Strategy

Future implementation should use Redis.

Use cache only where it provides measurable value.

Recommended cache targets:

- Dashboard Statistics
- School Configuration
- User Permissions
- Frequently Accessed Reference Data

Avoid caching frequently changing transactional data unless invalidation is well defined.

---

# Background Jobs

Long-running operations should execute asynchronously.

Examples:

- Email Sending
- Report Generation
- Data Export
- Bulk Student Import
- Notification Dispatch
- Audit Processing

Recommended queue system:

- BullMQ
- Redis

---

# File Storage

Uploaded files should not be stored inside the application server.

Recommended storage providers:

- AWS S3
- Azure Blob Storage
- Google Cloud Storage

Examples of uploaded assets:

- Student Photos
- Teacher Photos
- Assignment Attachments
- Certificates
- Documents

---

# Notification Architecture

Notifications should support multiple delivery channels.

Current:

- In-App Notifications

Future:

- Email
- SMS
- Push Notifications
- WhatsApp

Each notification should contain:

- Title
- Message
- Recipient
- Type
- Created Time
- Read Status

---

# Email Service

Email functionality should be isolated behind a dedicated service.

Examples:

- Welcome Email
- Password Reset
- Attendance Summary
- Assignment Notifications
- Result Publication

Email templates should be reusable and version-controlled.

---

# Scheduled Jobs

Scheduled jobs should use NestJS Scheduler.

Examples:

- Daily Attendance Summary
- Weekly Reports
- Session Cleanup
- Token Cleanup
- Backup Tasks

Jobs should be idempotent where possible.

---

# Database Migrations

All schema changes must be managed through migrations.

Migrations are generated by `drizzle-kit` from the TypeScript schema, then committed as plain SQL:

```bash
bun run db:generate    # schema diff → SQL migration
bun run db:migrate     # apply
```

Guidelines:

- Never modify production schema manually.
- Every database change must have a migration.
- Migrations are reviewed as SQL before deployment — the generated file is the artifact under review, not the TypeScript.
- Seed scripts should be deterministic, and must create at least two schools.
- **A migration adding a tenant table includes its RLS policy in the same migration.** A table that exists without its policy is unprotected for the entire window between deployments.
- Migrations run as the schema owner role. The application connects as a separate, non-owning role that cannot bypass RLS.

---

# Database Indexing

Indexes should be created for:

- `school_id` — leading every index used for filtering
- Foreign Keys
- Frequently Filtered Columns
- Search Fields
- Unique Constraints

**`school_id` leads every composite index.** Every query carries a `school_id` predicate, so an index that does not lead with it cannot serve the query efficiently:

```sql
-- Cannot serve WHERE school_id = ? AND status = ?
CREATE INDEX ON students (status);

-- Correct
CREATE INDEX ON students (school_id, status);
```

Indexes should be measured and reviewed periodically.

---

# Database Naming Conventions

Tables:

```text
students

teachers

attendance

assignments
```

Columns:

```text
created_at

updated_at

deleted_at

school_id

user_id
```

Use snake_case for database objects.

Use camelCase in TypeScript.

---

# Soft Delete Strategy

Critical business data should use soft deletes.

Instead of removing records:

```text
deleted_at = timestamp
```

Benefits:

- Auditability
- Recovery
- Historical Reporting

## Soft delete and unique constraints

A soft-deleted row still occupies its unique constraint. Re-enrolling a student with a previously used admission number would fail against a deleted record.

Unique constraints on soft-deletable tables are therefore **partial**:

```sql
CREATE UNIQUE INDEX students_school_admission_uq
  ON students (school_id, admission_number)
  WHERE deleted_at IS NULL;
```

## Soft delete and reads

Every read filters `deleted_at IS NULL`. Like tenant scoping, this belongs in the repository base class rather than in each query — the failure mode is the same, and so is the fix.

---

# Testing Strategy

The backend should include multiple layers of testing.

## Unit Tests

Test:

- Services
- Utilities
- Guards
- Pipes
- Validators

Tool: **Vitest**, matching the frontend so the workspace has one test runner.

---

## Integration Tests

Verify:

- Module interactions
- Repository behavior
- API layer
- **Tenant isolation**

## Tenant isolation tests are mandatory

Every repository has a test that seeds two schools, binds to School A, and asserts School B's rows are invisible through every read path — `findAll`, `findById`, every finder, every join, every aggregate.

Assert **empty results, not errors**. An error would suggest the row was located and then rejected; the row must never be visible in the first place.

A separate test executes a deliberately unscoped raw query with RLS active and asserts PostgreSQL returns nothing. If that test passes when it should fail, layer 3 is not actually installed.

See [06-multi-tenancy.md](06-multi-tenancy.md).

---

## End-to-End Tests

Cover complete workflows.

Examples:

- Login
- Student Creation
- Attendance Submission
- Assignment Review
- Result Publishing

---

# Performance Guidelines

Backend performance goals:

- Fast API response times
- Efficient database queries
- Minimal N+1 query issues
- Appropriate caching
- Optimized pagination
- Controlled memory usage

Performance should be measured using metrics rather than assumptions.

---

# Security Best Practices

Always:

- Validate input with Zod, stripping unknown keys
- Sanitize user data
- Hash passwords with **Argon2id**
- Use HTTPS
- Rotate secrets
- Restrict CORS to known origins — never `*` with credentials
- Rate limit per IP **and** per account on login, password reset, and refresh
- Validate uploaded files by content, not by extension
- Limit request payload size
- Scope every query, cache key, and object path by tenant

Security reviews should be part of the development process.

## Enumeration

Login failures return one message for both unknown email and wrong password. Distinguishing them tells an attacker which accounts exist.

Password reset returns success whether or not the address is registered.

## Response filtering

`passwordHash` and `refreshTokenHash` must never appear in a response. Never return a raw database row — response DTOs are an explicit allow-list of fields, and a serialization interceptor strips anything not in the DTO as a backstop.

---

# Configuration Management

All configuration should come from environment variables.

Examples:

- Database URL
- JWT Secret
- Refresh Secret
- Storage Keys
- Redis URL
- Email Credentials

Never hardcode secrets in the repository.

---

# CI/CD Expectations

Every pull request should pass:

- Type checking
- Linting
- Unit tests
- Integration tests
- Build verification

Future CI pipeline:

- GitHub Actions
- Automated deployments
- Security scanning
- Dependency auditing

---

# Deployment Strategy

The backend should remain container-ready.

Future deployment targets include:

- Docker
- Docker Compose
- Kubernetes

Production considerations:

- Multiple replicas
- Health checks
- Rolling updates
- Zero-downtime deployments

---

# Observability

Future observability stack:

- OpenTelemetry
- Prometheus
- Grafana
- Elasticsearch
- Kibana

Objectives:

- Trace requests
- Monitor latency
- Detect failures
- Visualize system health

---

# Evolution to Microservices

The initial architecture is a modular monolith.

Future extraction candidates include:

- Notifications
- Reporting
- Analytics
- AI Services
- File Processing

Extraction should occur only when justified by scale or operational needs.

Avoid premature microservices.

---

# Backend Coding Standards

Every backend contribution should:

- Follow module boundaries
- Use DTOs
- Validate input
- Return consistent responses
- Avoid duplicated logic
- Include tests where applicable
- Be fully typed
- Be documented if introducing architectural changes

---

# Backend Review Checklist

Before merging any change, verify:

- Module ownership is correct.
- **Every query, cache key, and object path is tenant-scoped.**
- **No DTO accepts `schoolId` from the client.**
- **New tenant tables ship with their RLS policy in the same migration.**
- **Cross-tenant isolation tests exist and pass.**
- Authorization is enforced.
- Validation is implemented.
- Logging is appropriate, with no secrets or tokens in log output.
- Audit events are recorded when required.
- Database access is efficient — no N+1, indexes lead with `school_id`.
- Error handling is consistent.
- Tests pass.
- Documentation is updated, including [00-status.md](00-status.md) if implementation status changed.

The first four are non-negotiable. A pull request failing any of them is not merged regardless of deadline.

---

# Backend Architecture Summary

The SchoolWise backend is designed around the following principles:

- Multi-tenant by construction, isolated at three independent layers
- Modular Monolith
- Clean Architecture
- Domain-Driven Modules
- Backend-First Security, secure by default with explicit opt-out
- RESTful APIs
- Strong Typing with schemas shared across the stack
- Consistent Validation
- Future Microservice Readiness

Every architectural decision should reinforce maintainability, scalability, security, and long-term evolution rather than short-term convenience.

---

# Related Documentation

- [README.md](../README.md)
- [00-status.md](00-status.md) — what actually exists
- [01-architecture.md](01-architecture.md)
- [02-frontend.md](02-frontend.md)
- [04-development-guidelines.md](04-development-guidelines.md)
- [05-roadmap.md](05-roadmap.md)
- [06-multi-tenancy.md](06-multi-tenancy.md) — **read before writing any query**
- [ADR-0004](adr/0004-multi-tenancy-in-v1.md), [ADR-0005](adr/0005-self-hosted-jwt-authentication.md), [ADR-0006](adr/0006-drizzle-over-prisma.md), [ADR-0007](adr/0007-nestjs-modular-monolith.md)

This document is the authoritative reference for backend development within the SchoolWise platform. Any architectural changes should be reflected here before implementation.
