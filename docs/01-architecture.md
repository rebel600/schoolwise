# SchoolWise Architecture

> Version: 2.0.0
> Status: Architecture Design
> Last Updated: 2026-08-02

---

> **This document describes the target architecture in the present tense.**
> Most of it is not implemented yet. For what exists in the repository today, see [00-status.md](00-status.md). For why each decision was made, see [adr/](adr/README.md).

---

# Purpose

This document defines the architecture of the SchoolWise platform.

It acts as the single source of truth for every architectural decision made throughout the lifecycle of the project.

Every developer should understand this document before contributing to the codebase.

---

# Project Vision

SchoolWise is a multi-tenant School Management Platform designed around modern software architecture principles.

Unlike traditional monolithic school management systems, SchoolWise separates business domains into independent frontend applications while keeping the backend modular and maintainable.

A single deployment serves many schools. Tenant isolation is structural, established in the first migration rather than retrofitted later.

The goal is to build software that can evolve for years without requiring architectural rewrites.

---

# Architectural Goals

The architecture should prioritize:

- Tenant isolation
- Security
- Scalability
- Maintainability
- Reusability
- Performance
- Developer Experience
- Independent Feature Development
- Long-Term Evolution
- Cloud Readiness

The first two are not negotiable against the rest. A change that improves performance or developer experience at the cost of tenant isolation is rejected.

---

# Core Architectural Principles

SchoolWise follows the following principles.

## Separation of Concerns

Every business domain owns its own implementation.

Examples:

- LMS
- Teacher
- Administration
- Principal
- Monitoring

Each application contains only code related to its own domain.

---

## Single Responsibility

Every application should solve one problem.

For example:

Teacher Application

Responsible for:

- Attendance
- Assignments
- Student Evaluation
- Timetable

It should never contain administration logic.

---

## Shared Libraries

Common functionality must never be duplicated.

Instead it should live inside shared workspace packages.

Examples

- Styleguide (components, theme, icons)
- Utilities
- API Client
- Types
- Hooks
- Config

---

## Backend First Security

The frontend improves user experience.

The backend enforces security.

Never trust the frontend.

All permissions must be validated by the backend.

---

## Tenant Isolation by Construction

A user authenticated to one school must never reach another school's data.

This is not achieved by remembering to filter. It is achieved by making the un-filtered path unavailable:

- `schoolId` is derived from the verified session and from nowhere else
- Repositories inherit tenant scoping rather than implementing it
- PostgreSQL Row-Level Security rejects whatever escapes the application layer

Specification: [06-multi-tenancy.md](06-multi-tenancy.md)

---

## Modular Backend

Although the backend starts as a modular monolith, every module should be isolated enough that it can be extracted into an independent service in the future.

---

# Technology Decisions

## Why React?

React provides:

- Large ecosystem
- Strong community
- Component-driven architecture
- Excellent TypeScript support
- Mature enterprise tooling

---

## Why Single-SPA?

Single-SPA allows multiple frontend applications to behave as one application.

Benefits:

- Independent deployment
- Independent development
- Domain isolation
- Incremental upgrades
- Team autonomy

---

## Why Bun workspaces + Turborepo?

The workspace is managed by Bun workspaces for dependency resolution and package linking, and Turborepo for task orchestration and caching.

This combination provides:

- Monorepo management
- Dependency-aware task graph
- Local and remote build caching
- Incremental builds
- Shared packages
- Consistent tooling

Module boundaries are enforced by `eslint-plugin-boundaries` rather than by the build system.

> Earlier drafts of this document specified Nx with pnpm. Nx was never present in the repository, and its Vite and Single-SPA integration is weak. See [ADR-0002](adr/0002-bun-workspaces-and-turborepo.md).

---

## Why Tailwind + shadcn/ui?

The design system is Tailwind CSS with components built on Radix UI primitives, following the shadcn/ui model — components are **owned** by the styleguide rather than imported from a component library.

Radix supplies keyboard navigation, focus management, and ARIA wiring, which the WCAG 2.1 AA target depends on.

> Earlier drafts specified Material UI **and** Tailwind together. Running both produces competing token systems and cascade conflicts. Material UI is not part of the stack. See [ADR-0003](adr/0003-tailwind-and-shadcn-over-material-ui.md).

---

# Workspace vs Micro Frontends

This project intentionally uses both.

These technologies solve different problems.

## Bun workspaces + Turborepo

Responsible for

- Source Code Organization
- Shared Packages
- Tooling
- Build Optimization
- Developer Experience

---

## Single-SPA

Responsible for

- Runtime Composition
- Loading Applications
- Routing
- Application Lifecycle

---

Together they provide both:

Excellent developer experience

AND

Independently deployable applications.

---

## The cost of Single-SPA

Runtime composition is not free, and the trade is accepted deliberately rather than assumed to be free:

- **Version skew** — a breaking change in the styleguide breaks consumers at runtime, with no build-time signal
- **Shared singletons** — `react`, `react-dom`, and `single-spa` must resolve to one instance each. A duplicate React silently breaks hooks.
- **Coordination** — every new application means another deployment target and another import map entry

The mitigations are mandatory, not advisory: externalize shared dependencies in every micro frontend, version the styleguide as a published contract, and express route ownership as an allow-list.

Rationale and revisit criteria: [ADR-0001](adr/0001-single-spa-micro-frontends.md).

---

# High Level Architecture

```
                        SchoolWise

                             │

                     Root Application

                             │

────────────────────────────────────────────────────

 Authentication

 Student LMS

 Teacher

 Principal

 Administration

 Monitoring

────────────────────────────────────────────────────

               Shared Packages

        Styleguide (components, theme, icons)

        API Client

        Utils

        Types

        Hooks

        Config

────────────────────────────────────────────────────

                  REST APIs

────────────────────────────────────────────────────

              NestJS  ·  Drizzle ORM

────────────────────────────────────────────────────

        PostgreSQL  (row-level tenant isolation)
```

---

# Workspace Structure

```
school-wise/

packages/

    root-config/          Single-SPA shell

    app-auth/

    app-lms/

    app-teacher/

    app-principal/

    app-administration/

    app-monitoring/

    styleguide/

    lib-api-client/

    lib-types/

    lib-utils/

    lib-hooks/

    lib-config/

    backend/              NestJS API

docs/

    adr/

package.json

turbo.json

tsconfig.base.json
```

The layout is flat. Role is conveyed by name prefix:

| Prefix        | Meaning                                            |
| ------------- | -------------------------------------------------- |
| `root-config` | Composes applications. Contains no business logic. |
| `app-*`       | Independently deployable micro frontend            |
| `lib-*`       | Imported by applications, never deployed           |
| `styleguide`  | Shared design system                               |
| `backend`     | NestJS API                                         |

---

# Why Shared Packages?

Imagine every application builds its own buttons and dialogs.

Eventually:

- Different versions
- Different themes
- Duplicate implementations
- Different design language

Instead:

Every application imports only from SchoolWise packages.

Example

Instead of

```tsx
const Button = (props) => (
  <button className="rounded bg-blue-600 ..." {...props} />
);
```

Use

```tsx
import { Button } from "@school-wise/styleguide";
```

Benefits

- One source of truth
- Consistent design
- Easy upgrades
- Easier testing
- Better maintainability

---

# Application Boundaries

Every application owns:

- Pages
- Components
- Routes
- Services
- API Calls
- Business Logic
- State

Applications should NOT directly depend on another application's internal implementation.

Communication should happen through:

- Shared libraries
- Public APIs
- Backend services

Never through private source files.

---

# Applications

## Root

Responsibilities

- Bootstrap Single-SPA
- Authentication validation
- Global Layout
- Theme Provider
- Error Boundary
- Navigation
- Workspace Switching
- Loading Micro Frontends

The Root application contains no business logic.

---

## Authentication

Responsible for

- Login
- Logout
- Forgot Password
- Reset Password
- Session Validation
- Token Refresh
- Profile Loading

---

## LMS

Audience

Students

Responsibilities

- Dashboard
- Courses
- Homework
- Assignments
- Attendance
- Timetable
- Results
- Downloads
- Profile

---

## Teacher

Responsibilities

- Attendance
- Assignment Review
- Marks
- Timetable
- Student Evaluation
- Communication

---

## Principal

Responsibilities

- School Reports
- Teacher Performance
- Student Analytics
- School Overview
- Academic Monitoring

---

## Administration

Responsibilities

- Student CRUD
- Teacher CRUD
- User Management
- Staff
- Classes
- Sections
- Subjects
- Fees
- School Configuration

---

## Monitoring

Responsibilities

- System Health
- API Metrics
- Performance
- Logs
- Audit
- Monitoring Dashboard

---

# Backend Architecture

The backend is implemented as a Modular Monolith using NestJS.

Each business domain exists as an isolated module.

Example modules:

- Schools (tenant registry and configuration)
- Authentication
- Users
- Students
- Teachers
- Principals
- Administration
- Attendance
- Assignments
- Timetable
- Results
- Notifications
- Dashboard
- Monitoring
- Audit

Each module should expose a clear public interface and avoid tight coupling with other modules.

The Schools module is the tenant root. Every other module's data hangs off it.

---

# Design Philosophy

The architecture favors long-term maintainability over short-term convenience.

Every new feature should answer the following questions before implementation:

- Which domain owns this feature?
- Is every query, cache key, and file path tenant-scoped?
- Can it be reused?
- Does it belong in a shared package?
- Does it violate application boundaries?
- Can it scale independently?
- Can it be tested independently?

If the answer to these questions is unclear, the architecture should be revisited before implementation.

---

# Architecture Principles Checklist

Every pull request should preserve these principles:

- Tenant isolation
- Domain isolation
- Shared code through packages
- Backend-first security
- No duplicated business logic
- Clear ownership of features
- Strong typing
- Clean APIs
- Reusable components
- Consistent design system
- Independent deployability
- Enterprise scalability

---

# Architecture Decision Records

Decisions that constrain future work are recorded in [adr/](adr/README.md).

| ADR                                                      | Decision                                 |
| -------------------------------------------------------- | ---------------------------------------- |
| [0001](adr/0001-single-spa-micro-frontends.md)           | Single-SPA for runtime composition       |
| [0002](adr/0002-bun-workspaces-and-turborepo.md)         | Bun workspaces + Turborepo instead of Nx |
| [0003](adr/0003-tailwind-and-shadcn-over-material-ui.md) | Tailwind + shadcn/ui, no Material UI     |
| [0004](adr/0004-multi-tenancy-in-v1.md)                  | Multi-tenancy from the first migration   |
| [0005](adr/0005-self-hosted-jwt-authentication.md)       | Self-hosted JWT authentication           |
| [0006](adr/0006-drizzle-over-prisma.md)                  | Drizzle ORM instead of Prisma            |
| [0007](adr/0007-nestjs-modular-monolith.md)              | NestJS modular monolith                  |

An ADR is immutable once accepted. Changing a decision means writing a new ADR that supersedes the old one.

---

# Topics Covered Elsewhere

| Topic                              | Document                                                     |
| ---------------------------------- | ------------------------------------------------------------ |
| Implementation status              | [00-status.md](00-status.md)                                 |
| Frontend structure, routing, state | [02-frontend.md](02-frontend.md)                             |
| Backend modules, API, database     | [03-backend.md](03-backend.md)                               |
| Engineering standards              | [04-development-guidelines.md](04-development-guidelines.md) |
| Phases and milestones              | [05-roadmap.md](05-roadmap.md)                               |
| Tenant isolation                   | [06-multi-tenancy.md](06-multi-tenancy.md)                   |
