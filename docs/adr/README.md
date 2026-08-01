# Architecture Decision Records

An ADR records **why** a decision was made, not just what was decided.

Documentation describes the current state. ADRs preserve the reasoning behind it, so a future team can tell the difference between a deliberate constraint and an accident.

---

## When to write an ADR

Write one when a decision:

- Is expensive to reverse
- Constrains future work
- Was contested, or had a credible alternative
- Will look wrong to someone who lacks the original context

Do not write one for routine implementation choices.

---

## Format

Every ADR contains:

- **Status** — Proposed / Accepted / Superseded by ADR-XXXX
- **Date**
- **Context** — the forces at play
- **Decision** — what was chosen
- **Alternatives Considered** — and why they lost
- **Consequences** — including the costs we accepted

An ADR is immutable once accepted. To change a decision, write a new ADR that supersedes it.

---

## Index

| ADR                                                  | Title                                    | Status   |
| ---------------------------------------------------- | ---------------------------------------- | -------- |
| [0001](0001-single-spa-micro-frontends.md)           | Single-SPA for runtime composition       | Accepted |
| [0002](0002-bun-workspaces-and-turborepo.md)         | Bun workspaces + Turborepo instead of Nx | Accepted |
| [0003](0003-tailwind-and-shadcn-over-material-ui.md) | Tailwind + shadcn/ui, no Material UI     | Accepted |
| [0004](0004-multi-tenancy-in-v1.md)                  | Multi-tenancy from the first migration   | Accepted |
| [0005](0005-self-hosted-jwt-authentication.md)       | Self-hosted JWT authentication           | Accepted |
| [0006](0006-drizzle-over-prisma.md)                  | Drizzle ORM instead of Prisma            | Accepted |
| [0007](0007-nestjs-modular-monolith.md)              | NestJS modular monolith                  | Accepted |
