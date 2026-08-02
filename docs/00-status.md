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

| Package              | Status      | Notes                                                                                                                                    |
| -------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `root-config`        | **Partial** | Shell with session bootstrap and an auth route guard. Still no layout, navigation, error boundary, or workspace switcher.                |
| `app-auth`           | **Built**   | Real login and forgot-password forms, React Hook Form + shared Zod schemas, wired to the API. The `localStorage` placeholder is deleted. |
| `styleguide`         | **Partial** | `Button`, `Input`, `Label`, `Alert`, `cn()`. Tailwind tokens as CSS custom properties. No Radix primitives yet.                          |
| `app-lms`            | **Planned** |                                                                                                                                          |
| `app-teacher`        | **Planned** |                                                                                                                                          |
| `app-principal`      | **Planned** |                                                                                                                                          |
| `app-administration` | **Planned** |                                                                                                                                          |
| `app-monitoring`     | **Planned** |                                                                                                                                          |
| `lib-api-client`     | **Built**   | Framework-free session store, in-memory token, auto-refresh with concurrent-request dedup. A **runtime singleton**, not bundled per app. |
| `lib-types`          | **Built**   | Zod schemas shared by both sides, so a contract change is a type error                                                                   |
| `lib-utils`          | **Planned** |                                                                                                                                          |
| `lib-hooks`          | **Planned** |                                                                                                                                          |
| `lib-config`         | **Planned** |                                                                                                                                          |

The `localStorage` placeholder is gone. The access token now lives in a module variable inside `lib-api-client`, and the refresh token in an `httpOnly` cookie — verified by an end-to-end test that asserts no JWT appears in either web storage.

---

# Backend

| Component               | Status      | Notes                                                                                                       |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| NestJS application      | **Built**   | Boots, versioned `/api/v1`, Swagger at `/api/docs`                                                          |
| Config                  | **Built**   | Zod-validated env, fails fast at startup with actionable errors                                             |
| Drizzle + PostgreSQL    | **Built**   | `postgres-js`, `prepare: false` for tenant-scoped transactions                                              |
| Schema                  | **Partial** | `schools`, `users`, `school_memberships`, `students`, `sessions`, `refresh_tokens`, `password_reset_tokens` |
| Migrations              | **Built**   | 4 migrations, applied to PostgreSQL 16                                                                      |
| **Tenant isolation**    | **Built**   | All three layers, **verified** — see below                                                                  |
| **Auth module**         | **Built**   | Login, refresh with rotation + reuse detection, logout, `/auth/me`                                          |
| Password reset          | **Built**   | Hashed single-use tokens, 1 h TTL, revokes every session on success                                         |
| Password hashing        | **Built**   | Argon2id, OWASP parameters                                                                                  |
| Rate limiting           | **Built**   | Login 10/min, refresh 60/min, reset 5/15 min. In-memory — see caveat below.                                 |
| Permissions             | **Built**   | Role → permission map, `PermissionsGuard`, embedded in the token                                            |
| Guards                  | **Built**   | Throttler → JWT → Roles → Permissions, all GLOBAL with `@Public()` opt-out                                  |
| Global exception filter | **Built**   | Standard envelope; stacks logged, never returned                                                            |
| Zod validation pipe     | **Built**   | Validates and strips unknown keys                                                                           |
| Health endpoint         | **Built**   | `GET /api/v1/health`, checks the database                                                                   |
| Seed script             | **Built**   | `db:seed` — creates TWO schools, so isolation bugs are visible                                              |
| Business modules        | **Planned** | Attendance, assignments, timetable, results, …                                                              |

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

## Auth — verified end to end

16 service tests, plus a full HTTP run against PostgreSQL 16.

| Check                                                             | Result                                     |
| ----------------------------------------------------------------- | ------------------------------------------ |
| Protected route without a token                                   | 401                                        |
| Wrong password vs unknown email                                   | identical message — no account enumeration |
| Suspended account refused                                         | ✅                                         |
| Refresh token stored hashed, never plaintext                      | ✅                                         |
| `accessToken` in body; refresh token only in an `httpOnly` cookie | ✅                                         |
| Refresh rotates the token                                         | ✅                                         |
| **Replaying a used token revokes the whole session family**       | ✅                                         |
| Refresh after logout rejected                                     | ✅                                         |
| Refresh after suspension rejected                                 | ✅                                         |
| Tampered token rejected                                           | 401                                        |
| Tenant bound from the token matches the user's school             | ✅                                         |
| Login and refresh work **as the app role, with RLS in force**     | ✅                                         |

> **Two design bugs were found here, both by end-to-end testing rather than unit tests.**
>
> **1. RLS on `school_memberships` broke login entirely.** Login must read memberships to _discover_ which school to bind — before any tenant exists. The policy matched zero rows, so every login failed with "Invalid email or password." Memberships are now a documented global table (migration `0002`), with layer-2 scoping mandatory for administrative access.
>
> The unit tests all passed, because they ran as the PGlite **superuser**, which bypasses RLS. A regression test now exercises login as the non-owning application role.
>
> **2. `APP_INTERCEPTOR` did not get its dependencies injected.** `TenantInterceptor` injects the request-scoped `TenantContext`; without an explicit `scope: Scope.REQUEST`, Nest built it as a bootstrap singleton with `this.tenant` undefined, and every authenticated request 500'd.
>
> Also corrected: tenant binding was originally a **middleware**, which cannot work — NestJS runs middleware _before_ guards, so `req.user` did not exist yet. It is now an interceptor.

## End-to-end — verified in a real browser

8 Playwright tests against the full stack: shell → auth micro frontend → API → PostgreSQL.

| Check                                                      | Result |
| ---------------------------------------------------------- | ------ |
| Signed-out visitor redirected to `/login`                  | ✅     |
| Malformed email caught client-side, no request sent        | ✅     |
| Wrong password and unknown email give the **same** message | ✅     |
| Valid credentials sign in and leave the login screen       | ✅     |
| Refresh cookie is `httpOnly` + `SameSite=Strict`           | ✅     |
| **No JWT in `localStorage` or `sessionStorage`**           | ✅     |
| Reload restores the session from the cookie alone          | ✅     |
| Forgot-password never reveals whether an account exists    | ✅     |

Run with `bun run test:e2e`. Deliberately outside `turbo test` — it needs Docker, the API, and four dev servers, whereas Vitest suites must stay runnable anywhere.

> **Three bugs found only by running it in a browser.**
>
> **1. Duplicate React.** `lib-api-client` used zustand, which pulls in React. As a shared runtime singleton it became a _second_ React beside each app's own, and every hook died with `Invalid hook call … Cannot read properties of null`. The store is now framework-free plain state; each application binds it with its own `useSyncExternalStore`. The thing that must be shared is state, not a React binding.
>
> **2. Named throttlers apply globally.** Defining `auth` and `reset` buckets alongside `default` does **not** scope them to those routes — NestJS enforces every named throttler on every route, so the strictest silently became the API-wide limit and threw 429 across the board. There is now one bucket, overridden per handler.
>
> **3. Dev-server module identity.** Vite resolves a bare workspace specifier to `/@fs/...`, ignoring the import map, so each dev server served its own copy of the shared packages from a different origin. Fixed by one `vite.shared-modules.ts` used by every config.

## Not yet done on the backend

- **No email delivery.** The reset token is logged in development and never returned in a response; a mail service is required before this ships.
- **MFA and SSO** remain deferred by [ADR-0005](adr/0005-self-hosted-jwt-authentication.md).
- **No concrete repository yet.** `TenantRepository` is written, typed, and tested but has no subclass; `students` has no service or controller.
- **`grantsSql()` in `src/database/rls.ts` is unused** — role creation is currently manual (`docker-compose.yml`) and in the test harness. Wire it into a migration when provisioning is automated.
- **Rate limiting is in-memory.** Fine for one instance; multiple replicas need the Redis storage adapter or each replica enforces its own budget.

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

1. Enable branch protection on `main` and confirm CI actually runs on a PR
2. Email delivery, so password reset works outside development
3. First concrete `TenantRepository` subclass plus a students module, as the reference implementation
4. Shell — layout, navigation, workspace switcher, error boundary
5. The remaining micro frontends: LMS, teacher, principal, administration, monitoring
6. Redis-backed rate limiting once more than one replica runs

Steps 2 and 3 are the gaps [ADR-0005](adr/0005-self-hosted-jwt-authentication.md) names as prerequisites before this auth module is production-ready. Without rate limiting, the login endpoint is an open brute-force target regardless of how good the hashing is.

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
