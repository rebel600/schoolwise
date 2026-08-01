# 🎓 SchoolWise

> A multi-tenant School Management Platform built with **React**, **Single-SPA Micro Frontends**, **Bun workspaces**, and **NestJS**.

---

![Status](https://img.shields.io/badge/status-Early%20Development-orange)
![Architecture](https://img.shields.io/badge/Architecture-Micro%20Frontend-success)
![Frontend](https://img.shields.io/badge/Frontend-React%2018-61DAFB)
![Backend](https://img.shields.io/badge/Backend-NestJS-E0234E)
![Workspace](https://img.shields.io/badge/Workspace-Bun%20%2B%20Turborepo-000000)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

> **Most of this platform is not built yet.**
> The documentation describes the target architecture. For what actually exists in the repository today, read **[docs/00-status.md](docs/00-status.md)** first.

---

# 📖 Overview

SchoolWise is a school management platform designed to serve many institutions from a single deployment.

The frontend is composed of independently deployable React applications, one per business domain, assembled at runtime by Single-SPA. Each domain evolves on its own schedule while users experience one continuous application.

The backend is a NestJS modular monolith: isolated domain modules with clear public interfaces, structured so individual modules can be extracted into services when scale justifies it — and not before.

**Tenant isolation is a first-class concern, not a later migration.** Every table carries a school identifier from the first migration, enforced at three independent layers. See [docs/06-multi-tenancy.md](docs/06-multi-tenancy.md).

---

# 🎯 Vision

- Multi-tenant from day one
- Secure by construction, not by discipline
- Independently deployable domains
- Reusable shared platform
- Accessible to WCAG 2.1 AA
- Maintainable across years, not sprints

---

# ✨ Scope

**Version 1.0**

Authentication and RBAC · Multi-tenancy · Student management · Teacher management · User management · Classes, sections, subjects · Attendance · Assignments · Timetable · Results · Dashboards · Notifications (in-app) · Audit logging · Monitoring

**Deferred** — parent portal, fees and payments, library, transport, hostel, mobile applications, real-time messaging, AI features, offline support.

Full breakdown in [docs/05-roadmap.md](docs/05-roadmap.md).

---

# 🏛 Architecture

```text
                          Browser
                             │
                      Root Application            ← Single-SPA shell
                             │
   ┌─────────┬─────────┬─────┴────┬──────────┬────────────┐
  Auth      LMS      Teacher   Principal   Admin    Monitoring
   └─────────┴─────────┴──────────┴──────────┴────────────┘
                             │
              Styleguide · API Client · Types · Utils
                             │
                        REST API (v1)
                             │
              NestJS Modular Monolith  ·  Drizzle ORM
                             │
              PostgreSQL  (row-level tenant isolation)
```

Two systems with distinct jobs:

- **Bun workspaces + Turborepo** manage source code, dependencies, and builds
- **Single-SPA** composes deployed applications at runtime

---

# 🛠 Technology Stack

## Frontend

| Concern      | Choice                                   |
| ------------ | ---------------------------------------- |
| Framework    | React 18 + TypeScript                    |
| Composition  | Single-SPA + import maps                 |
| Build        | Vite                                     |
| Styling      | Tailwind CSS                             |
| Components   | shadcn/ui pattern on Radix UI primitives |
| Icons        | lucide-react                             |
| Routing      | React Router                             |
| Server state | TanStack Query                           |
| Client state | Zustand                                  |
| Forms        | React Hook Form + Zod                    |
| Tables       | TanStack Table                           |

## Backend

| Concern       | Choice                               |
| ------------- | ------------------------------------ |
| Framework     | NestJS (Express adapter)             |
| ORM           | Drizzle                              |
| Database      | PostgreSQL                           |
| Validation    | Zod                                  |
| Auth          | JWT access + rotating refresh tokens |
| Authorization | Tenant-scoped RBAC + permissions     |
| Docs          | Swagger / OpenAPI                    |

## Workspace

Bun · Turborepo · TypeScript (strict) · ESLint · Prettier · Husky · Commitlint · Vitest · Playwright

> Material UI, Nx, pnpm, Prisma, Redux Toolkit, and Axios appeared in earlier drafts of this documentation and are **not** part of the stack. See [docs/adr/](docs/adr/README.md).

---

# 📁 Repository Structure

```text
school-wise/
├── packages/
│   ├── root-config/         Single-SPA shell — composition only, no business logic
│   ├── app-auth/            authentication micro frontend
│   ├── app-lms/             students                        (planned)
│   ├── app-teacher/         teachers                        (planned)
│   ├── app-principal/       principals                      (planned)
│   ├── app-administration/  administrators                  (planned)
│   ├── app-monitoring/      operations                      (planned)
│   ├── styleguide/          shared design system
│   ├── lib-api-client/      HTTP client, auth, refresh      (planned)
│   ├── lib-types/           shared contracts                (planned)
│   ├── lib-utils/           framework-agnostic helpers      (planned)
│   ├── lib-hooks/           shared React hooks              (planned)
│   ├── lib-config/          environment configuration       (planned)
│   └── backend/             NestJS API — tenant infra built
├── docs/
│   └── adr/                 architecture decision records
├── package.json
└── turbo.json
```

Package role is conveyed by name prefix: `app-*` deploys, `lib-*` is imported, `root-config` composes.

---

# 🚀 Getting Started

## Prerequisites

- Bun 1.1+
- Node 20+
- PostgreSQL 16+ _(once the backend exists)_

## Install and run

```bash
bun install
bun run dev
```

This starts every package in parallel:

| Package       | Port |
| ------------- | ---- |
| `root-config` | 9000 |
| `styleguide`  | 4001 |
| `app-auth`    | 4002 |

Open **http://localhost:9000**. `/` redirects to `/login`.

> Ports are fixed and `strictPort` is enabled, because `packages/root-config/index.html` hardcodes them in its import map. A port conflict fails loudly rather than silently reassigning.

## Adding a micro frontend

1. Create `packages/app-<domain>/` from an existing app package
2. Assign the next free port and set it in `vite.config.ts`
3. Mark `react`, `react-dom`, `single-spa`, and `@school-wise/styleguide` as `external` in `build.rollupOptions`
4. Add the module to the import map in `packages/root-config/index.html`
5. Register it in `packages/root-config/src/main.ts` with an **allow-list** of owned routes

Step 3 is not optional — omitting it produces a second React instance and hooks break at runtime with no build error.

## Backend

```bash
docker compose up -d                    # PostgreSQL 16 on :5432
cp .env.example .env                    # then fill DATABASE_URL and JWT_ACCESS_SECRET

cd packages/backend
bun run db:generate                     # schema change → SQL migration
bun run db:migrate                      # apply, as the schema OWNER
bun run dev                             # http://localhost:3000/api/v1/health
```

Swagger is served at `/api/docs` outside production.

> **Two database roles, deliberately.** Migrations run as `schoolwise_owner`; the application connects as `schoolwise_app`, which owns no tables and has neither `BYPASSRLS` nor superuser. Running the app as the owner silently disables Row-Level Security — layer 3 of tenant isolation. See [docs/06-multi-tenancy.md](docs/06-multi-tenancy.md).

Backend tests need no Docker: they run against PGlite, a real PostgreSQL compiled to WASM, so tenant isolation is verified on every commit rather than skipped when infrastructure is absent.

---

# 🔐 Authentication

Centralized in the backend `auth` module. No frontend application implements its own login flow.

```text
Login → verify credentials → bind session to school → issue tokens
                                                          ↓
        access JWT (15 min, in memory)  +  refresh token (30 d, httpOnly cookie)
                                                          ↓
                              shell resolves roles → loads permitted workspaces
```

- Refresh tokens are **opaque, stored hashed, and rotated on every use**
- Reusing a rotated token revokes the whole session family and raises a security event
- Access tokens live in memory only — never `localStorage`
- Passwords are hashed with Argon2id

Details in [ADR-0005](docs/adr/0005-self-hosted-jwt-authentication.md).

---

# 🛡 Authorization

Backend-first. The frontend hides what a user cannot do; the backend decides what a user may do. Frontend checks are a UX affordance and are never trusted.

**Roles** — Super Administrator · Administrator · Principal · Teacher · Student
**Planned** — Parent · Librarian · Accountant · Receptionist · Transport Manager

Roles attach to a **school membership**, not to a user. The same person can be a Teacher at one school and a Principal at another.

## Workspace access

| Role                | Workspaces                                          |
| ------------------- | --------------------------------------------------- |
| Student             | LMS                                                 |
| Teacher             | Teacher                                             |
| Principal           | Principal, Teacher, LMS                             |
| Administrator       | Administration, Principal, Teacher, LMS             |
| Monitoring          | Monitoring, Administration, Principal, Teacher, LMS |
| Super Administrator | All                                                 |

Switching workspaces within a school does not require re-authentication. Switching **schools** issues a new session.

---

# 🏫 Multi-Tenancy

One deployment, many schools. Isolation is enforced at three layers:

1. **Tenant context** — `schoolId` comes only from the verified session, never from a request
2. **Repository base class** — composes the tenant predicate into every query
3. **PostgreSQL Row-Level Security** — rejects anything that escapes layer 2

Backed by integration tests asserting cross-tenant reads return empty.

Read [docs/06-multi-tenancy.md](docs/06-multi-tenancy.md) before writing any query, cache key, or file path.

---

# 📚 Documentation

| Document                                                          | Purpose                               |
| ----------------------------------------------------------------- | ------------------------------------- |
| [00-status.md](docs/00-status.md)                                 | **What actually exists** — read first |
| [01-architecture.md](docs/01-architecture.md)                     | System architecture and principles    |
| [02-frontend.md](docs/02-frontend.md)                             | Frontend implementation guide         |
| [03-backend.md](docs/03-backend.md)                               | Backend implementation guide          |
| [04-development-guidelines.md](docs/04-development-guidelines.md) | Engineering handbook                  |
| [05-roadmap.md](docs/05-roadmap.md)                               | Phases, milestones, future direction  |
| [06-multi-tenancy.md](docs/06-multi-tenancy.md)                   | Tenant isolation specification        |
| [adr/](docs/adr/README.md)                                        | Why decisions were made               |

Documents 01–06 describe the **target** architecture in the present tense. `00-status.md` is the authority on what is implemented.

---

# 🤝 Contributing

Read [docs/04-development-guidelines.md](docs/04-development-guidelines.md) first.

- Conventional Commits
- Branches: `feature/` `bugfix/` `hotfix/` `refactor/` `docs/` `test/` `chore/`
- No direct commits to `main`
- Update `docs/00-status.md` in the same PR that changes implementation status
- Architectural changes need an ADR

---

# 📄 License

MIT.

---

> **Build once. Scale forever.**
