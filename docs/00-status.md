# Implementation Status

> Last Updated: 2026-08-02
> Purpose: distinguish what exists from what is planned

---

# Why this document exists

The rest of the documentation is written in the present tense and the imperative voice — "the API client handles token refresh", "applications import from the styleguide". That voice describes the **target architecture**, not the current repository.

Read as description, those documents would send a new contributor looking for code that has not been written yet.

**This document is the authoritative answer to "does this exist?"** Every other document answers "how should this work?"

Update this file in the same pull request that changes implementation status. A stale status document is worse than none.

---

# Legend

| Marker      | Meaning                                      |
| ----------- | -------------------------------------------- |
| **Built**   | Implemented, working, in the repository      |
| **Partial** | Exists but incomplete or provisional         |
| **Planned** | Designed and documented, not yet implemented |

---

# Frontend

| Package              | Status      | Notes                                                                                                                                                                      |
| -------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root-config`        | **Partial** | Single-SPA shell. Registers `app-auth`, allow-list route activation, import map in `index.html`. No layout, navigation, auth guard, error boundary, or workspace switcher. |
| `app-auth`           | **Partial** | Renders a static card with a Sign In button. No form, validation, API call, or routing. `auth-store.ts` is a `localStorage` placeholder — see warning below.               |
| `styleguide`         | **Partial** | One component (`Button`). Tailwind configured with CSS custom property tokens. No Radix primitives yet.                                                                    |
| `app-lms`            | **Planned** |                                                                                                                                                                            |
| `app-teacher`        | **Planned** |                                                                                                                                                                            |
| `app-principal`      | **Planned** |                                                                                                                                                                            |
| `app-administration` | **Planned** |                                                                                                                                                                            |
| `app-monitoring`     | **Planned** |                                                                                                                                                                            |
| `lib-api-client`     | **Planned** |                                                                                                                                                                            |
| `lib-types`          | **Planned** |                                                                                                                                                                            |
| `lib-utils`          | **Planned** |                                                                                                                                                                            |
| `lib-hooks`          | **Planned** |                                                                                                                                                                            |
| `lib-config`         | **Planned** |                                                                                                                                                                            |

> **`app-auth/src/auth-store.ts` is a development placeholder and must not reach production.**
> It writes a token to `localStorage`, which is readable by any script on the origin and is the exact pattern [ADR-0005](adr/0005-self-hosted-jwt-authentication.md) prohibits. The production design keeps the access token in memory and the refresh token in an `httpOnly` cookie. Delete this file when the real auth client lands.

---

# Backend

| Component               | Status      | Notes                                                               |
| ----------------------- | ----------- | ------------------------------------------------------------------- |
| NestJS application      | **Built**   | Boots, versioned `/api/v1`, Swagger at `/api/docs`                  |
| Config                  | **Built**   | Zod-validated env, fails fast at startup with actionable errors     |
| Drizzle + PostgreSQL    | **Built**   | `postgres-js`, `prepare: false` for tenant-scoped transactions      |
| Schema                  | **Partial** | `schools`, `users`, `school_memberships`, `students`                |
| Migrations              | **Built**   | `0000_initial_tenant_schema.sql`, applied to PostgreSQL 16          |
| **Tenant isolation**    | **Built**   | All three layers, **verified** — see below                          |
| Global exception filter | **Built**   | Standard envelope; stacks logged, never returned                    |
| Zod validation pipe     | **Built**   | Validates and strips unknown keys                                   |
| Health endpoint         | **Built**   | `GET /api/v1/health`, checks the database                           |
| Auth module             | **Planned** | Next phase — [ADR-0005](adr/0005-self-hosted-jwt-authentication.md) |
| RBAC guards             | **Planned** |                                                                     |
| Business modules        | **Planned** | Attendance, assignments, timetable, results, …                      |

## Tenant isolation — verified, not assumed

The three layers of [06-multi-tenancy.md](06-multi-tenancy.md) are implemented and covered by 18 passing tests. Tests run against **real PostgreSQL** via PGlite (Postgres compiled to WASM), so they need no Docker daemon and run on every commit — an isolation test that gets skipped when infrastructure is missing reports green while proving nothing.

| Check                                                       | Result                 |
| ----------------------------------------------------------- | ---------------------- |
| Unscoped `SELECT` returns only the bound tenant's rows      | ✅                     |
| Another tenant's row is invisible even by primary key       | ✅ empty, not an error |
| No tenant bound → zero rows, not every row                  | ✅                     |
| Cross-tenant `INSERT` blocked by `WITH CHECK`               | ✅                     |
| `UPDATE` cannot move a row into another tenant              | ✅                     |
| `DELETE` cannot reach another tenant's rows                 | ✅                     |
| Tenant setting does not survive its transaction             | ✅                     |
| Same admission number allowed in two schools                | ✅                     |
| Duplicate admission number rejected within one school       | ✅                     |
| Every tenant table has an RLS policy                        | ✅                     |
| `FORCE ROW LEVEL SECURITY` set, so the owner cannot bypass  | ✅                     |
| `schools` / `users` correctly excluded from tenant policies | ✅                     |
| `TenantContext` fails closed when unbound                   | ✅                     |
| `TenantContext` refuses to rebind mid-request               | ✅                     |

Also confirmed manually against **PostgreSQL 16** in Docker, connecting as the non-owning `schoolwise_app` role: identical results.

> **A real bug was found here.** The first RLS policy used `current_setting(..., true)::uuid`. That returns NULL only until a transaction has set the variable once — afterwards the session value is the **empty string**, and `''::uuid` raises `22P02` instead of matching nothing. On a pooled connection the second request would error rather than return an empty result. Fixed with `NULLIF(..., '')`, and both the migration and the spec now carry the explanation.

## Not yet done on the backend

- **No authentication.** `TenantMiddleware` reads `req.user.schoolId`, which nothing populates yet. Every route is effectively unauthenticated, and `TenantContext` therefore stays unbound and throws on any repository access — fail-closed, but not usable until the auth module lands.
- **No concrete repository yet.** `TenantRepository` is written and typed but has no subclass; `students` has no service or controller.
- **`grantsSql()` in `src/database/rls.ts` is unused** — role creation is currently manual (`docker-compose.yml` comments) and in the test harness. Wire it into a migration when provisioning is automated.

---

# Tooling

| Concern                                  | Status      | Notes                                                                       |
| ---------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| Git repository                           | **Built**   | Initialized on `main`. No remote yet — branch protection still outstanding. |
| Bun workspaces                           | **Built**   | `packages/*`, pinned via `packageManager`                                   |
| Vite build                               | **Built**   | Per package                                                                 |
| Turborepo                                | **Built**   | `turbo.json`; full run 4.6s cold, 63ms cached                               |
| TypeScript strict + `tsconfig.base.json` | **Built**   | `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`      |
| ESLint                                   | **Built**   | Flat config, ESLint 9                                                       |
| `eslint-plugin-boundaries`               | **Built**   | Enforced and **verified against deliberate violations** — see below         |
| Prettier                                 | **Built**   | Checked in CI and pre-commit                                                |
| Husky + Commitlint                       | **Built**   | `pre-commit` (format, lint), `commit-msg` (Conventional Commits)            |
| Vitest                                   | **Built**   | Shared base config, jsdom, Testing Library. 5 tests on `Button`.            |
| CI pipeline                              | **Built**   | `.github/workflows/ci.yml` — untested until a remote exists                 |
| Single-SPA integration                   | **Partial** | Works in dev; see caveats below                                             |
| Playwright                               | **Planned** | Meaningful only once there are real user journeys                           |

## Verified, not just configured

The boundary rules were tested by writing deliberate violations and confirming they fail:

| Violation                             | Result                                           |
| ------------------------------------- | ------------------------------------------------ |
| An app importing the shell            | ✅ blocked — `'app' may not import 'shell'`      |
| An app importing another app's source | ✅ blocked — with the cross-app guidance message |
| An app importing its own files        | ✅ allowed                                       |

The first attempt at this **passed when it should have failed**: without `eslint-import-resolver-typescript`, extensionless `.ts` imports did not resolve and the rule silently skipped them. A quality gate nobody has watched fail is a gate nobody knows is broken.

> **Still outstanding:** there is no git remote, so branch protection is not configured and the CI workflow has never executed. Push to a remote and enable required status checks on `main`.

---

# Known caveats in the current build

**Cross-package dev resolution is a workaround.** `packages/app-auth/vite.config.ts` defines a `devRemoteModuleProxy` plugin that rewrites `@school-wise/styleguide` to a URL on port 4001. It exists because Vite's dev server cannot resolve an import map entry. It works, but it is a workaround, and every new micro frontend must replicate it.

**Fast Refresh is installed by the shell.** `root-config/index.html` imports `@react-refresh` from a micro frontend's dev server because the shell has no React plugin of its own. It now tries multiple ports and degrades gracefully, but HMR still depends on at least one micro frontend dev server being up.

**Shared dependencies must stay external.** `react`, `react-dom`, `single-spa`, and `@school-wise/styleguide` are marked `external` in each micro frontend's Rollup config and provided through the import map. Removing an `external` entry produces a duplicate React instance, which breaks hooks at runtime with no build error.

**Ports are fixed and `strictPort` is set.** 9000 shell, 4001 styleguide, 4002 auth. A port conflict fails the dev server rather than silently reassigning — intentional, since the import map hardcodes these.

---

# Immediate next steps

Ordered by dependency, not by visible progress:

1. Push to a remote, enable branch protection on `main`, confirm CI actually runs
2. Auth module — Argon2id, login, refresh with rotation and reuse detection, sessions ([ADR-0005](adr/0005-self-hosted-jwt-authentication.md))
3. `JwtAuthGuard` populating `req.user`, so `TenantMiddleware` can bind — global guards with explicit `@Public()` opt-out
4. RBAC — `RolesGuard`, `PermissionsGuard`, scoped to school membership
5. First concrete `TenantRepository` subclass plus a students module, as the reference implementation
6. `lib-api-client` and `lib-types`
7. Real auth application, replacing the `localStorage` placeholder store
8. Shell — layout, navigation, auth guard, workspace switcher, error boundary

Step 1 is minutes of work and is the only thing standing between the CI pipeline and being real.

Step 3 is what makes the tenant infrastructure reachable: everything below layer 1 is built and tested, but nothing populates `req.user` yet, so no request can currently bind a tenant.

---

# Toolchain notes

**Bun is not on `PATH`.** It lives at `C:\Users\shyam\.bun\bin`. Add it to your shell profile, or every `bun` command fails with "command not found".

**Pinned versions and why.** `bun add` resolves latest, which pulled TypeScript 7 and ESLint 10. Both were rolled back:

- **TypeScript 5.9** — `typescript-eslint` declares `typescript: >=4.8.4 <6.1.0`. TS 7 is outside it.
- **ESLint 9** — `eslint-plugin-react@7.37` crashes on ESLint 10's changed rule-context API (`contextOrFilename.getFilename is not a function`).

Check both peer ranges before upgrading either.

---

# Related documentation

- [README.md](../README.md)
- [01-architecture.md](01-architecture.md)
- [02-frontend.md](02-frontend.md)
- [03-backend.md](03-backend.md)
- [04-development-guidelines.md](04-development-guidelines.md)
- [05-roadmap.md](05-roadmap.md)
- [06-multi-tenancy.md](06-multi-tenancy.md)
- [adr/](adr/README.md)
