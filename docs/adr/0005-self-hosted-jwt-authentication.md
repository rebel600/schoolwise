# ADR-0005 — Self-hosted JWT authentication

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

Authentication had to be settled before any protected endpoint could be built. The options were a managed identity provider (Clerk, Auth0, WorkOS), a self-hosted library (Better Auth, Auth.js), or a first-party implementation.

Managed providers deliver login, session management, token rotation, password reset, MFA, SSO, and device management immediately, and their organization primitives map cleanly onto multi-school tenancy. The costs are per-MAU pricing, a hard external dependency in the login path, and user identity living outside our database.

SchoolWise targets educational institutions, where per-user pricing scales badly — a single school contributes thousands of student accounts that log in rarely — and data residency requirements are common.

## Decision

**Implement authentication in the `auth` module of the NestJS backend**, using access and refresh JWTs, as originally documented.

Specification:

- **Access token** — JWT, 15 minute lifetime, carries `sub`, `email`, `schoolId`, `roles`, `permissions`, `sessionId`
- **Refresh token** — opaque random value, 30 day lifetime, **stored hashed** in the database, never a JWT
- **Rotation** — every refresh issues a new refresh token and invalidates the previous one
- **Reuse detection** — presenting an already-rotated refresh token revokes the entire session family and raises a security audit event. This is the primary defense against refresh token theft.
- **Transport** — refresh token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie. Access token in memory only, never in `localStorage`.
- **Password hashing** — Argon2id
- **Rate limiting** — per-IP and per-account throttling on login, password reset, and refresh
- **Sessions** — a database row per authenticated device, enabling remote logout and device management

`schoolId` is bound to the session at login and is authoritative for tenant scoping. It is never read from a request body or header.

## Alternatives Considered

**Clerk.** Fastest path, strong DX, and Organizations map directly onto schools. Rejected on per-MAU economics for the student population, and on the hard external dependency in the login path.

**Better Auth / Auth.js.** Self-hosted, no per-user cost, handles token and session plumbing. A genuinely close call — this is the fallback if the first-party implementation proves burdensome. Rejected for now to keep the auth module free of framework assumptions that conflict with tenant-scoped RBAC.

## Consequences

- Several weeks of implementation, plus permanent ownership of a security-critical surface.
- MFA, SSO, and social login are future work, not features that arrive with a config flag. The roadmap reflects this.
- The auth module needs security review before production, and dependency auditing on an ongoing basis.
- **The refresh token table must never store raw tokens.** A database read must not yield usable credentials.
- Full control over token contents, session lifetime, and tenant binding — which the tenant-scoped RBAC model in [ADR-0004](0004-multi-tenancy-in-v1.md) depends on.
- No per-user cost, and identity data stays in our PostgreSQL instance.

**Revisit if** MFA and SSO become customer requirements before the module is hardened. At that point Better Auth is the migration target, not a from-scratch MFA implementation.
