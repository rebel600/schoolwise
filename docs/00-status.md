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

| Component  | Status                                          |
| ---------- | ----------------------------------------------- |
| Everything | **Planned** — `packages/backend` does not exist |

No NestJS application, database, schema, migration, or endpoint has been created. All backend documentation is specification.

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
2. `packages/backend` — NestJS, Drizzle, PostgreSQL, config, logging, Swagger
3. Tenant infrastructure — context, middleware, `TenantRepository`, RLS ([ADR-0004](adr/0004-multi-tenancy-in-v1.md))
4. Tenant-aware schema, first migration, cross-tenant isolation tests
5. Auth module — login, refresh with rotation and reuse detection, sessions, RBAC guards
6. `lib-api-client` and `lib-types`
7. Real auth application, replacing the placeholder store
8. Shell — layout, navigation, auth guard, workspace switcher, error boundary

Step 1 is minutes of work and is the only thing standing between the CI pipeline and being real. Steps 3 and 4 come before any business table exists — retrofitting tenancy afterwards is the failure mode [ADR-0004](adr/0004-multi-tenancy-in-v1.md) exists to prevent.

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
