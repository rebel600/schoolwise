# ADR-0002 — Bun workspaces + Turborepo instead of Nx

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

The original documentation specified Nx with pnpm, an `apps/` + `libs/` layout, and `@schoolwise/*` package scoping.

The repository as built uses Bun workspaces, a flat `packages/*` layout, Vite for every package, and `@school-wise/*` scoping. No Nx configuration ever existed.

Nx would have provided four things the repository lacks: task caching, a dependency graph, code generators, and module boundary enforcement.

## Decision

**Standardize on Bun workspaces + Turborepo.** Remove Nx from the documentation entirely.

- **Bun workspaces** — dependency resolution and package linking (already in place)
- **Turborepo** — task orchestration, dependency-aware task graph, local and remote caching
- **eslint-plugin-boundaries** — module boundary enforcement
- **Vite** — per-package build, unchanged

Package scope is `@school-wise/*`. Layout is flat `packages/*`, with role communicated by name prefix:

```
packages/
  root-config/      the Single-SPA shell
  app-*/            deployable micro frontends
  styleguide/       shared design system
  lib-*/            shared libraries
  backend/          NestJS API
```

## Alternatives Considered

**Adopt Nx as documented.** Rejected: Nx's Vite and Single-SPA integration is weak, and migrating a working build to Nx executors is real cost for benefits Turborepo delivers with a single config file. Nx's generators matter most in large workspaces with high project churn; this workspace has fewer than a dozen packages.

**Bun workspaces alone, no orchestrator.** Rejected: `bun run --filter "*" build` runs tasks without dependency ordering or caching. The styleguide must build before its consumers, and CI would rebuild everything on every commit.

**Migrate to an `apps/` + `libs/` layout.** Rejected as churn without benefit. Turborepo has no opinion on directory layout, and the naming convention conveys the same information.

## Consequences

- No Nx generators. New packages are created from a documented template.
- Module boundaries are enforced by ESLint rather than the build system. A misconfigured lint rule silently stops enforcing — the boundary config is therefore covered by a test.
- Turborepo remote caching requires either Vercel or a self-hosted cache server. Local caching works with no configuration.
- All documentation referencing Nx, pnpm, `apps/`, `libs/`, or `@schoolwise/*` is obsolete and has been corrected.
