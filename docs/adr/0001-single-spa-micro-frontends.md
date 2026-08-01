# ADR-0001 — Single-SPA for runtime composition

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

SchoolWise serves six distinct audiences — students, teachers, principals, administrators, monitoring operators, and unauthenticated users. Each audience has a workflow that shares almost nothing with the others.

The question was whether these should be separate deployable applications composed at runtime, or route groups inside one application.

Micro frontends primarily solve an **organizational** problem: independent teams releasing on independent schedules without coordinating a shared build. They are not primarily a performance or code-quality technique.

At the time of this decision the repository contained two applications and a styleguide, and the Single-SPA integration was already fighting the tooling in several places:

- A hand-written `devRemoteModuleProxy` Vite plugin to resolve cross-package imports in dev
- `/* @vite-ignore */` on the dynamic import in the shell to defeat static analysis
- A `normalizeUrl` crash avoided by externalizing the styleguide in the Rollup config
- A React Fast Refresh preamble hardcoded to a single micro frontend's dev port

## Decision

**Keep Single-SPA** as the runtime composition layer.

Each domain application is an independently built and deployed ES module. The shell (`root-config`) owns registration, route activation, and the import map. Micro frontends never import one another.

The known costs are accepted deliberately, and mitigated as described below.

## Alternatives Considered

**Single application with domain modules.** One Vite/React app, domains under `src/domains/*`, boundaries enforced by lint rules. Simpler build, working HMR, no runtime version skew, no import map to coordinate. Rejected: it forfeits independent deployability, which is a stated product requirement for the platform.

**Vite Module Federation.** Retains independent deployability with build-time dependency sharing and fewer runtime resolution workarounds. Rejected: the Single-SPA integration already exists and works; the migration cost was not justified by the tooling improvement alone.

## Consequences

**Accepted costs:**

- Runtime version skew is possible. A breaking change in `@school-wise/styleguide` breaks consumers at runtime with no build-time signal.
- Shared dependencies (React, React DOM, Single-SPA) must resolve to a single instance. Duplicated React silently breaks hooks.
- HMR requires the shell to install the Fast Refresh hook on behalf of micro frontends.
- Every new application adds a deployment target and an import map entry.

**Required mitigations:**

- `react`, `react-dom`, and `single-spa` are declared in the import map and marked `external` in every micro frontend's Rollup config. This is not optional.
- `@school-wise/styleguide` is versioned and treated as a published contract. Breaking changes require a major version and a coordinated import map update.
- Route ownership is expressed as an **allow-list** in the shell. A deny-list causes an application to activate on every unclaimed route.
- Contract tests verify each micro frontend exports valid `bootstrap`, `mount`, and `unmount` lifecycles before deployment.

**Revisit this decision if** after twelve months the platform is still built by a single team. At that point the coordination cost is being paid for a benefit nobody is collecting, and [ADR-0002](0002-bun-workspaces-and-turborepo.md)'s package boundaries make consolidation into one application straightforward.
