# Development Guidelines

> Version: 2.0.0
> Project: SchoolWise
> Last Updated: 2026-08-02

---

> **The repository is not yet under version control.** Every rule below about branches, commits, and pull requests is unenforceable until `git init` is run. That is the highest-priority gap — see [00-status.md](00-status.md).

---

# Purpose

This document defines the engineering standards and development practices for the SchoolWise platform.

Every contributor should follow these guidelines to ensure the codebase remains maintainable, scalable, secure, and consistent.

These guidelines apply to:

- Frontend Applications
- Backend Services
- Shared Libraries
- Infrastructure Code
- CI/CD Pipelines
- Documentation

---

# Engineering Philosophy

SchoolWise is built for long-term maintainability rather than short-term speed.

Every engineering decision should prioritize:

- Readability
- Simplicity
- Consistency
- Reusability
- Scalability
- Testability
- Security

The code should be easy to understand by a developer joining the project years later.

---

# Core Engineering Principles

## Simplicity First

Prefer the simplest solution that satisfies the requirement.

Avoid introducing unnecessary abstraction or complexity.

---

## Readable Code

Code is read far more often than it is written.

Prioritize clear naming, small functions, and self-explanatory logic over clever implementations.

---

## Consistency

Follow existing patterns.

Do not introduce new architectural or coding styles unless there is a clear benefit and team agreement.

---

## Reusability

Before creating new code, check whether similar functionality already exists.

Shared functionality belongs in shared libraries rather than being duplicated.

---

## Scalability

Design features with future growth in mind.

Avoid assumptions that limit future expansion, such as hardcoded values or tightly coupled implementations.

---

# SOLID Principles

All application code should follow the SOLID principles.

## Single Responsibility Principle

Each class, component, or service should have one reason to change.

---

## Open/Closed Principle

Software should be open for extension but closed for modification.

Favor composition and configuration over modifying existing implementations.

---

## Liskov Substitution Principle

Derived classes should be interchangeable with their base classes without altering expected behavior.

---

## Interface Segregation Principle

Keep interfaces focused and specific.

Avoid large interfaces with unrelated responsibilities.

---

## Dependency Inversion Principle

Depend on abstractions rather than concrete implementations.

Use dependency injection wherever appropriate.

---

# Clean Code Principles

Developers should write code that is:

- Small
- Focused
- Predictable
- Easy to test
- Easy to review

Avoid:

- Deep nesting
- Long functions
- Duplicate logic
- Magic numbers
- Hardcoded strings
- Unclear variable names

---

# DRY Principle

**Don't Repeat Yourself**

Duplicate logic should be extracted into reusable functions, services, or shared libraries.

---

# KISS Principle

**Keep It Simple, Stupid**

Do not solve problems that do not exist.

Prefer straightforward solutions over complex abstractions.

---

# YAGNI Principle

**You Aren't Gonna Need It**

Implement features only when they are required.

Avoid speculative development.

---

# Project Ownership

Every feature must have a clear owner.

Ownership helps maintain accountability and reduces overlapping implementations.

Examples:

- Authentication Team
- LMS Team
- Teacher Team
- Administration Team

---

# Architecture First

Before implementing a feature, ask:

- Does this belong to an existing module?
- Is every query, cache key, and file path tenant-scoped?
- Can it be reused?
- Does it violate architectural boundaries?
- Does a shared package already solve this problem?

If unsure, discuss the design before implementation.

---

# Git Workflow

SchoolWise follows a Git-based workflow with protected branches.

Primary branches:

```text id="y8z4pw"
main

develop
```

Feature development should never occur directly on the `main` branch.

---

# Branch Strategy

Recommended branch naming:

```text id="l6mfw8"
feature/student-management

feature/attendance-module

feature/teacher-dashboard

bugfix/login-timeout

bugfix/api-validation

hotfix/security-patch

release/v1.0.0

docs/backend-guidelines

refactor/shared-ui
```

Branch names should clearly describe the purpose of the work.

---

# Branch Types

| Prefix      | Purpose                                    |
| ----------- | ------------------------------------------ |
| `feature/`  | New functionality                          |
| `bugfix/`   | Bug fixes                                  |
| `hotfix/`   | Critical production fixes                  |
| `release/`  | Release preparation                        |
| `docs/`     | Documentation                              |
| `refactor/` | Code improvements without behavior changes |
| `test/`     | Testing-related work                       |
| `chore/`    | Maintenance tasks                          |

---

# Commit Message Convention

SchoolWise follows **Conventional Commits**.

Examples:

```text id="vm8j7r"
feat(auth): add JWT refresh token support

feat(student): implement student profile page

fix(attendance): resolve duplicate attendance entries

refactor(ui): simplify table component

docs(api): update authentication guide

test(results): add unit tests for grading service

chore(deps): update dependencies
```

Benefits:

- Clear history
- Automated changelogs
- Easier releases
- Better traceability

---

# Commit Guidelines

A commit should:

- Represent one logical change
- Compile successfully
- Pass tests
- Include only related modifications

Avoid combining unrelated changes in a single commit.

---

# Pull Request Process

Every change should be submitted through a Pull Request (PR).

A PR should include:

- Summary of changes
- Motivation
- Related issue or task
- Screenshots (for UI changes)
- Testing notes
- Breaking changes (if any)

---

# Pull Request Checklist

Before requesting a review:

- Code builds successfully
- Linting passes
- Tests pass
- No unnecessary files included
- Documentation updated (if needed)
- No debug code remains
- No commented-out code
- No merge conflicts

---

# Code Review Principles

Code reviews should improve quality, not criticize individuals.

Review feedback should focus on:

- Correctness
- Readability
- Maintainability
- Performance
- Security
- Consistency

Constructive discussions are encouraged.

---

# What Reviewers Should Check

- Architectural consistency
- Module boundaries
- Naming
- Reusability
- Error handling
- Validation
- Security
- Performance
- Accessibility (Frontend)
- Test coverage

---

# Definition of Done

A task is considered complete only when:

- Requirements are implemented
- Code reviewed
- Tests pass
- Documentation updated
- No critical issues remain
- Feature works in supported environments

Completing the implementation alone does not mark a task as done.

---

# Documentation Requirements

Documentation should accompany meaningful architectural or behavioral changes.

Update documentation when:

- Adding a new module
- Changing API contracts
- Modifying shared libraries
- Introducing new development workflows
- Updating deployment procedures

Documentation is part of the deliverable, not an afterthought.

---

# Communication Guidelines

When collaborating:

- Ask questions early.
- Raise architectural concerns before implementation.
- Document important decisions.
- Keep discussions respectful and objective.
- Base decisions on technical merit rather than personal preference.

---

# Engineering Mindset

Every engineer working on SchoolWise should strive to:

- Leave the codebase better than they found it.
- Optimize for long-term maintainability.
- Think in terms of systems, not isolated features.
- Respect established architectural boundaries.
- Write code that future teammates can confidently extend.

These principles form the foundation of the SchoolWise engineering culture.

---

# TypeScript Standards

TypeScript is mandatory throughout the SchoolWise platform.

Do not use plain JavaScript for application code.

Goals:

- Type Safety
- Better Refactoring
- Better IDE Support
- Fewer Runtime Errors

---

# General TypeScript Rules

Always:

- Enable strict mode.
- Prefer explicit types for public APIs.
- Use interfaces for object contracts.
- Use type aliases where appropriate.
- Avoid the `any` type.

Preferred:

```ts
interface Student {
  id: string;
  name: string;
}
```

Avoid:

```ts
const student: any = {};
```

Use `unknown` instead of `any` when the type is not yet known.

---

# Naming Conventions

## Variables

Use camelCase.

```ts
studentName;

teacherList;

attendanceCount;
```

---

## Functions

Use camelCase and descriptive verbs.

```ts
createStudent();

calculateAttendance();

publishResults();
```

Avoid vague names such as:

```ts
doTask();

process();

handle();
```

---

## Components

Use PascalCase.

```tsx
StudentCard;

AttendanceTable;

TeacherProfile;
```

---

## Interfaces

Prefix with `I` is **not** required.

Preferred:

```ts
interface Student {}
```

Not:

```ts
interface IStudent {}
```

---

## Enums

Use PascalCase.

```ts
enum UserRole {
  Student,
  Teacher,
  Principal,
}
```

---

## Constants

Use UPPER_SNAKE_CASE for true constants.

```ts
MAX_FILE_SIZE;

DEFAULT_PAGE_SIZE;

JWT_EXPIRATION;
```

Configuration values should come from the configuration layer rather than being hardcoded.

---

# Folder Organization

Keep folders organized by feature rather than by file type whenever practical.

Preferred:

```text
attendance/

  components/

  hooks/

  services/

  pages/

  types/
```

Avoid dumping unrelated files into large generic folders.

---

# File Size Guidelines

Recommended maximums:

- Component: ~300 lines
- Service: ~300 lines
- Hook: ~200 lines
- Utility: Keep focused on a single responsibility

Large files should be split into smaller, cohesive units.

---

# Function Guidelines

Functions should:

- Perform one task
- Be easy to read
- Have descriptive names
- Avoid deep nesting

Prefer early returns over multiple nested conditions.

---

# React Guidelines

Prefer Functional Components.

Do not create new Class Components.

---

## Component Responsibilities

Components should focus on presentation.

Business logic belongs in:

- Hooks
- Services
- Stores
- Feature modules

---

## Hooks

Use hooks to encapsulate reusable logic.

Examples:

- useStudents
- useAttendance
- useDebounce

Avoid duplicating hook logic across applications.

---

## Props

Define explicit prop types.

Avoid loosely typed props.

Preferred:

```tsx
type StudentCardProps = {
  student: Student;
};
```

---

# State Management

Use the smallest scope possible.

Order of preference:

1. Local Component State
2. Custom Hooks
3. Context (for localized shared state)
4. Zustand (global client state)

Server data is not application state. It belongs in TanStack Query, never copied into a store.

Do not place temporary UI state into a global store unnecessarily.

---

# Store Guidelines

Global client state should be limited to:

- Authentication session
- Theme
- Notifications
- User Preferences

Avoid storing derived or transient state globally. Derived values are computed at render; storing them creates a second source of truth that drifts.

Query keys are tenant-prefixed so a school switch cannot serve the previous school's cached data:

```ts
queryKey: ["school", schoolId, "students", filters];
```

---

# API Calls

All HTTP communication must use `@school-wise/lib-api-client`.

Applications must not construct their own `fetch` wrappers.

Benefits:

- Consistent headers
- Authentication and automatic token refresh
- Retry logic
- Logging and request correlation
- Error handling

---

# Error Handling

Errors should be handled gracefully.

Display user-friendly messages.

Do not expose internal server errors or stack traces to users.

Always provide meaningful fallback behavior where possible.

---

# Forms

Recommended stack:

- React Hook Form
- Zod

Validation should occur:

- On the client for user experience
- On the server for correctness

---

# Styling Guidelines

SchoolWise uses **Tailwind CSS** with components built on **Radix UI**, following the shadcn/ui model. Material UI is not part of the stack — see [ADR-0003](adr/0003-tailwind-and-shadcn-over-material-ui.md).

Rules:

- Use design tokens from `@school-wise/styleguide`.
- Avoid inline styles unless necessary.
- **Never hardcode colors.** `bg-blue-600` in an application is a defect; the token is `bg-primary`. Hardcoded colors break dark mode and per-school branding, and the breakage is invisible until someone enables them.
- Keep spacing consistent.
- Compose class names with `cn()` from the styleguide, so conditional classes merge predictably instead of fighting over specificity.

Applications should never create their own design language.

---

# Responsive Design

Every page should support:

- Mobile
- Tablet
- Desktop
- Large Desktop

Use responsive utilities consistently.

---

# Accessibility

Every UI should include:

- Semantic HTML
- Keyboard navigation
- Proper labels
- Focus management
- Accessible dialogs
- Sufficient color contrast

Accessibility is a functional requirement.

---

# NestJS Standards

Controllers should:

- Receive requests
- Validate input
- Delegate work to services
- Return responses

Controllers should not contain business logic.

---

# Services

Services contain business rules.

Responsibilities include:

- Validation beyond DTOs
- Authorization checks (when applicable)
- Business workflows
- Coordination between repositories

Services should not directly manage HTTP concerns.

---

# Repositories

Repositories are responsible for:

- Reading data
- Writing data
- Database queries

Repositories should not contain business rules.

---

# DTO Guidelines

Every request and response should use DTOs.

Examples:

- CreateStudentDto
- UpdateTeacherDto
- StudentResponseDto

Never expose database models directly through the API.

**No request DTO contains `schoolId`.** It comes from the verified session. A DTO that cannot express the field makes the mistake unrepresentable.

---

# Validation

Validate all incoming data.

Use **Zod**, with schemas shared between frontend and backend through `@school-wise/lib-types`. Defining a contract once means a backend change surfaces as a frontend type error rather than a runtime surprise.

Unknown keys are stripped, not passed through.

Do not trust client-provided input.

---

# Logging

Use the centralized logging mechanism.

Avoid leaving `console.log()` statements in committed production code.

**Never log tokens, passwords, password hashes, or refresh tokens.** Logs are widely readable, retained longer than expected, and frequently shipped to third-party services.

Include meaningful context in log messages.

---

# Environment Variables

All configuration must come from environment variables.

Examples:

- Database URL
- JWT Secret
- Redis URL
- Email Credentials
- Storage Configuration

Never commit secrets to source control.

---

# Security Standards

Every feature should consider:

- Authentication
- Authorization
- Input validation
- Output sanitization
- Rate limiting
- Secure file uploads
- Least privilege

Security should be designed into features rather than added later.

---

# Documentation Standards

Public APIs, shared libraries, and complex workflows should include documentation.

Update documentation when behavior changes.

Well-documented systems reduce onboarding time and improve maintainability.

---

# Testing Standards

Every feature should include appropriate tests.

Recommended layers:

- Unit Tests
- Integration Tests
- End-to-End Tests

Critical business logic should always be covered by automated tests.

---

# Performance Guidelines

Optimize only after measuring.

Focus on:

- Efficient rendering
- Lazy loading
- Database query optimization
- Pagination
- Virtualization for large datasets

Avoid premature optimization.

---

# Code Quality Checklist

Before submitting code, verify:

- Strong typing
- Clear naming
- No duplicate logic
- Proper error handling
- Tests updated where required
- Documentation updated if behavior changed
- Follows architectural boundaries
- Uses shared libraries where appropriate

Every contribution should improve or preserve the overall quality of the codebase.

---

# Release Strategy

SchoolWise follows a predictable and controlled release process.

The objective is to deliver new features safely while minimizing risk to production.

Release types:

- Major Releases
- Minor Releases
- Patch Releases
- Hotfix Releases

---

# Semantic Versioning

SchoolWise follows **Semantic Versioning (SemVer)**.

Format:

```text
MAJOR.MINOR.PATCH
```

Examples:

```text
1.0.0
1.1.0
1.1.5
2.0.0
```

### MAJOR

Increment when introducing breaking changes.

Example:

- API contract changes
- Authentication redesign
- Database schema changes requiring migration

---

### MINOR

Increment when adding backward-compatible features.

Examples:

- New dashboard
- Attendance reports
- Library management module

---

### PATCH

Increment for backward-compatible bug fixes.

Examples:

- UI fixes
- Validation fixes
- Performance improvements
- Security patches (non-breaking)

---

# Dependency Management

All dependencies should be reviewed before installation.

Guidelines:

- Prefer well-maintained libraries.
- Avoid unnecessary packages.
- Keep dependencies updated.
- Remove unused dependencies.
- Prefer built-in platform features when practical.

Every dependency increases maintenance cost.

---

# Package Installation Policy

Before adding a package, ask:

- Can this be implemented with existing code?
- Is the package actively maintained?
- Does it have a strong community?
- Is it compatible with our license requirements?
- Does it introduce unnecessary bundle size?

Document significant dependency decisions.

---

# Workspace Rules

Bun workspaces manage dependencies. Turborepo manages tasks. See [ADR-0002](adr/0002-bun-workspaces-and-turborepo.md).

The layout is flat under `packages/`, with role conveyed by name prefix:

| Prefix        | Role                      | May be imported by        |
| ------------- | ------------------------- | ------------------------- |
| `root-config` | Composes applications     | nothing                   |
| `app-*`       | Deployable micro frontend | nothing                   |
| `lib-*`       | Shared library            | apps, other libs, backend |
| `styleguide`  | Design system             | apps                      |
| `backend`     | NestJS API                | nothing                   |

Do not place reusable code inside application folders.

Dependency direction is enforced by `eslint-plugin-boundaries`. The rules are covered by a test, because a misconfigured lint rule silently stops enforcing and nothing fails.

## Common commands

```bash
bun install                                    # install
bun run dev                                    # all packages
turbo build                                    # build, dependency-ordered and cached
turbo build --filter=@school-wise/app-lms      # one package and its dependencies
turbo lint typecheck test --filter="...[origin/main]"   # only what changed
```

---

# Single-SPA Development Rules

Single-SPA is responsible for runtime composition.

Guidelines:

- Each micro frontend owns its routes, declared as an **allow-list** in the shell. Never a deny-list — a deny-list activates the application on every route nobody has claimed.
- Route prefixes must not overlap between applications.
- Applications must remain independently deployable.
- Applications must not directly import code from other applications.
- Shared functionality belongs in `lib-*` packages.
- The Root application is responsible for composition, not business logic.
- **`react`, `react-dom`, `single-spa`, and `@school-wise/styleguide` must be `external` in every micro frontend's Rollup config.** Bundling them produces a duplicate React instance and hooks break at runtime with no build error.
- The import map pins exact styleguide versions. A styleguide upgrade is a deliberate shell deployment.

---

# Shared Library Governance

Before creating a new shared library:

- Verify the functionality is reused by at least two applications.
- Ensure it is generic and not domain-specific.
- Keep the public API stable.
- Avoid introducing application-specific dependencies.

Examples of shared packages:

- Styleguide — components, theme, icons
- API Client
- Utilities
- Types
- Hooks
- Configuration

Because the styleguide is loaded at runtime through an import map rather than bundled, its public API is a **deployed contract**, not an internal detail. A breaking change requires a major version and a coordinated import map update. Treat it with the care you would give a published package.

---

# API Contract Governance

Frontend and backend teams should agree on API contracts before implementation.

Recommended practices:

- Version APIs from day one — `/api/v1/...`.
- Define contracts as Zod schemas in `@school-wise/lib-types`, consumed by both sides. One definition, no drift.
- Document endpoints using Swagger, generated from those schemas.
- Avoid breaking existing contracts.
- Deprecate endpoints before removal.
- Keep request and response structures consistent.

---

# Configuration Management

Environment-specific configuration should be externalized.

Typical environments:

- Development
- Testing
- Staging
- Production

Never change source code to switch environments.

---

# CI/CD Expectations

Every change should pass automated checks before merging.

Minimum pipeline:

- Install dependencies
- Lint
- Type check
- Unit tests
- Build verification

Future enhancements:

- Integration tests
- End-to-end tests
- Security scanning
- Dependency auditing
- Automated deployments

---

# Code Quality Gates

A pull request should not be merged if:

- Build fails.
- Linting fails.
- Tests fail.
- Architecture rules are violated.
- Documentation is missing for significant changes.

Quality gates protect the long-term health of the project.

---

# Technical Debt

Technical debt is sometimes necessary but must be intentional.

When introducing technical debt:

- Document it.
- Explain the reason.
- Estimate the impact.
- Create a follow-up task for resolution.

Avoid accumulating undocumented debt.

---

# Architecture Decision Records (ADRs)

Major architectural decisions are documented as ADRs in [docs/adr/](adr/README.md).

Write one when a decision is expensive to reverse, constrains future work, was contested, or would look wrong to someone lacking the original context. Do not write one for routine implementation choices.

Each ADR includes:

- Status
- Date
- Context
- Decision
- Alternatives Considered
- Consequences — **including the costs accepted**

An ADR is **immutable once accepted**. To change a decision, write a new ADR that supersedes it. Editing history to match current opinion destroys the only record of why the original choice made sense.

Decisions recorded so far:

| ADR                                                      | Decision                                 |
| -------------------------------------------------------- | ---------------------------------------- |
| [0001](adr/0001-single-spa-micro-frontends.md)           | Single-SPA for runtime composition       |
| [0002](adr/0002-bun-workspaces-and-turborepo.md)         | Bun workspaces + Turborepo instead of Nx |
| [0003](adr/0003-tailwind-and-shadcn-over-material-ui.md) | Tailwind + shadcn/ui, no Material UI     |
| [0004](adr/0004-multi-tenancy-in-v1.md)                  | Multi-tenancy from the first migration   |
| [0005](adr/0005-self-hosted-jwt-authentication.md)       | Self-hosted JWT authentication           |
| [0006](adr/0006-drizzle-over-prisma.md)                  | Drizzle ORM instead of Prisma            |
| [0007](adr/0007-nestjs-modular-monolith.md)              | NestJS modular monolith                  |

---

# AI-Assisted Development

AI tools such as ChatGPT and Claude Code are encouraged to improve productivity.

Recommended uses:

- Code generation
- Documentation
- Refactoring suggestions
- Test generation
- Boilerplate creation
- Architecture brainstorming

AI-generated code must always be reviewed by a developer before merging.

AI should accelerate development, not replace engineering judgment.

---

# Security Reviews

Security should be considered throughout development.

Review:

- Authentication
- Authorization
- Input validation
- File uploads
- Secrets management
- Dependency vulnerabilities
- API exposure

Conduct periodic dependency and security audits.

---

# Performance Reviews

Performance should be measured continuously.

Monitor:

- API response times
- Frontend bundle size
- Database query performance
- Memory usage
- CPU utilization

Optimize based on evidence rather than assumptions.

---

# Documentation Culture

Documentation is a first-class deliverable.

Keep documentation synchronized with implementation.

When introducing new modules or workflows:

- Update architecture documents.
- Update README if applicable.
- Document configuration changes.
- Record significant architectural decisions.

---

# Onboarding Checklist

New contributors should:

- Read [README.md](../README.md)
- Read [00-status.md](00-status.md) — **what actually exists**, before anything else
- Read [01-architecture.md](01-architecture.md)
- Read [02-frontend.md](02-frontend.md) or [03-backend.md](03-backend.md), depending on their work
- Read [06-multi-tenancy.md](06-multi-tenancy.md) — **required before writing any query**
- Read this development guidelines document
- Skim [adr/](adr/README.md) to understand why the stack looks the way it does
- Set up the development environment
- Run the project locally
- Complete a small starter task

Documents 01–06 describe the target architecture in the present tense. `00-status.md` is the authority on what is implemented. Reading them in the wrong order sends people looking for code that has not been written.

Consistent onboarding reduces ramp-up time.

---

# Production Readiness Checklist

Before releasing a feature:

- Requirements implemented
- Code reviewed
- Tests passing
- **Tenant isolation tests passing** (backend)
- Documentation updated, including [00-status.md](00-status.md) if implementation status changed
- Logging added where appropriate, with no secrets in log output
- Error handling verified
- Security validated
- Performance reviewed
- Accessibility checked (Frontend)
- Monitoring configured if required

A feature is not production-ready until all applicable checks are complete.

---

# Long-Term Maintenance

SchoolWise is expected to evolve over many years.

Maintainability should always take precedence over short-term convenience.

Prefer solutions that are:

- Easy to understand
- Easy to test
- Easy to extend
- Easy to replace

Avoid introducing unnecessary complexity that future teams must support.

---

# Engineering Culture

The SchoolWise engineering team values:

- Collaboration
- Respectful feedback
- Continuous learning
- Knowledge sharing
- Automation
- Quality
- Accountability

Every contributor is responsible for improving the codebase and helping teammates succeed.

---

# Development Guidelines Summary

The SchoolWise development process is built around:

- Clean Architecture
- Domain-Driven Design
- Strong TypeScript practices
- Shared libraries
- Consistent coding standards
- Automated quality checks
- Comprehensive documentation
- Secure development
- Measured performance
- Continuous improvement

Following these guidelines ensures that SchoolWise remains maintainable, scalable, and reliable as the platform grows.

---

# Related Documentation

- [README.md](../README.md)
- [00-status.md](00-status.md) — what actually exists
- [01-architecture.md](01-architecture.md)
- [02-frontend.md](02-frontend.md)
- [03-backend.md](03-backend.md)
- [05-roadmap.md](05-roadmap.md)
- [06-multi-tenancy.md](06-multi-tenancy.md)
- [adr/](adr/README.md)

This document is the engineering handbook for SchoolWise. All contributors should treat it as the standard reference for development practices and update it whenever team-wide conventions evolve.
