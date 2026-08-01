# Frontend Architecture

> Document Version: 2.0.0
> Project: SchoolWise
> Framework: React + Single-SPA + Bun workspaces
> Last Updated: 2026-08-02

---

> **This document describes the target frontend in the present tense.**
> Three packages exist today, all partial. See [00-status.md](00-status.md).

---

# Purpose

This document defines the frontend architecture of SchoolWise.

It serves as the implementation guide for every frontend application inside the SchoolWise ecosystem.

Every developer contributing to the frontend should follow the principles and conventions described in this document.

---

# Frontend Vision

SchoolWise is designed as an enterprise-grade frontend platform built around **Micro Frontends**.

The objective is to ensure:

- Independent development
- Independent deployment
- High maintainability
- Reusable UI
- Consistent user experience
- Clear ownership of business domains
- Scalability for future applications

Although the user experiences one application, internally the system is composed of multiple independently developed React applications orchestrated by Single-SPA.

---

# Technology Stack

| Concern      | Choice                                           |
| ------------ | ------------------------------------------------ |
| Framework    | React 18 + TypeScript (strict)                   |
| Workspace    | Bun workspaces + Turborepo                       |
| Composition  | Single-SPA + import maps                         |
| Build        | Vite                                             |
| Styling      | Tailwind CSS                                     |
| Components   | shadcn/ui pattern on Radix UI primitives         |
| Icons        | lucide-react, re-exported by the styleguide      |
| Routing      | React Router                                     |
| HTTP         | `fetch` wrapped by `@school-wise/lib-api-client` |
| Server state | TanStack Query                                   |
| Client state | Zustand                                          |
| Forms        | React Hook Form + Zod                            |
| Tables       | TanStack Table                                   |
| Dates        | date-fns + react-day-picker                      |
| Testing      | Vitest + React Testing Library + Playwright      |

---

## Notes on the choices that changed

**No Material UI.** Running MUI alongside Tailwind produces two competing token systems and unpredictable cascade order. The styleguide owns its components. See [ADR-0003](adr/0003-tailwind-and-shadcn-over-material-ui.md).

**TanStack Query instead of RTK Query.** Server state and client state are different problems. TanStack Query handles caching, revalidation, and deduplication without requiring a global store, which matters when each micro frontend is independently deployed — a shared Redux store across Single-SPA boundaries is a coupling point that runtime composition makes fragile.

**Zustand instead of Redux Toolkit.** The genuinely global client state is small: theme, notifications, and the session. Zustand covers it without reducers, actions, and store configuration, and does not require a provider at the shell boundary.

**`fetch` instead of Axios.** `fetch` is native, has no bundle cost, and — since every micro frontend externalizes shared dependencies — one fewer shared singleton to coordinate across the import map.

---

## State ownership

| State                                 | Where it lives                    |
| ------------------------------------- | --------------------------------- |
| Form state, dialog open, selected row | Local component state             |
| Reusable stateful logic               | Custom hooks in `lib-hooks`       |
| Server data                           | TanStack Query                    |
| Session, theme, notifications         | Zustand store in `lib-api-client` |

Global state should remain minimal. Server data does not belong in a client store.

---

# Why Micro Frontends?

Traditional frontend applications become difficult to maintain as they grow.

Common issues include:

- Huge codebases
- Merge conflicts
- Tight coupling
- Long build times
- Shared ownership confusion

Micro Frontends solve these problems by splitting the application into domain-oriented applications.

Example domains:

- LMS
- Teacher
- Principal
- Administration
- Monitoring
- Authentication

Each application evolves independently while still presenting a unified experience.

---

# Why Bun workspaces + Turborepo?

They manage the development workspace.

Responsibilities include:

- Monorepo management
- Dependency resolution and linking
- Dependency-aware task graph
- Build caching
- Shared packages
- Consistent tooling

Module boundaries are enforced by `eslint-plugin-boundaries`.

These tools do not orchestrate runtime applications.

Single-SPA handles runtime composition.

See [ADR-0002](adr/0002-bun-workspaces-and-turborepo.md).

---

# Frontend Architecture

```text
                        Browser

                            │

                     Root Application

                            │

────────────────────────────────────────────────────

 Authentication

 LMS

 Teacher

 Principal

 Administration

 Monitoring

────────────────────────────────────────────────────

 Shared Packages

 Styleguide (components, theme, icons)

 API Client

 Types

 Utils

 Hooks

 Config

────────────────────────────────────────────────────

 REST APIs

────────────────────────────────────────────────────

 NestJS Backend
```

---

# Workspace Structure

```text
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
```

`app-*` packages are independently deployable micro frontends.

`lib-*` packages and the styleguide are reusable code shared across applications, never deployed on their own.

---

# Dev Server Ports

Ports are fixed and `strictPort` is enabled, because the import map in `packages/root-config/index.html` hardcodes them.

| Package              | Port |
| -------------------- | ---- |
| `root-config`        | 9000 |
| `styleguide`         | 4001 |
| `app-auth`           | 4002 |
| `app-lms`            | 4003 |
| `app-teacher`        | 4004 |
| `app-principal`      | 4005 |
| `app-administration` | 4006 |
| `app-monitoring`     | 4007 |

A port conflict fails the dev server rather than silently reassigning. That is intentional — a reassigned port would produce a working dev server serving modules nothing can import.

---

# Micro Frontend Responsibilities

Every micro frontend owns its own:

- Pages
- Routes
- Components
- Business Logic
- Services
- API Integration
- Local State
- Assets
- Tests

A micro frontend must never import another micro frontend directly.

Shared functionality belongs in shared libraries.

---

# Root Application

The Root application is the shell of SchoolWise.

Responsibilities:

- Bootstrap Single-SPA
- Register micro frontends
- Global layout
- Navigation
- Authentication validation
- Theme provider
- Error boundary
- Workspace switcher
- Global notifications
- Loading indicators

The Root application must not contain business-specific features.

---

# Authentication Application

The authentication application is responsible for identity.

Features:

- Login
- Logout
- Forgot Password
- Reset Password
- Session Validation
- Refresh Token Handling
- User Profile
- Initial Permission Fetch

Authentication logic should remain centralized.

Other applications consume authenticated user context rather than implementing their own authentication flows.

---

# Domain Applications

## LMS

Audience:

Students

Responsibilities:

- Dashboard
- Courses
- Homework
- Assignments
- Attendance
- Timetable
- Results
- Downloads
- Student Profile

---

## Teacher

Responsibilities:

- Dashboard
- Attendance
- Assignment Review
- Homework
- Student Evaluation
- Timetable
- Announcements

---

## Principal

Responsibilities:

- School Dashboard
- Reports
- Teacher Performance
- Student Analytics
- Academic Monitoring

---

## Administration

Responsibilities:

- Student Management
- Teacher Management
- Staff Management
- User Management
- Subjects
- Classes
- Sections
- Fee Configuration
- School Configuration

---

## Monitoring

Responsibilities:

- System Health
- Application Metrics
- Performance Monitoring
- Logs
- Audit Dashboard
- Operational Insights

---

# Shared Packages

SchoolWise emphasizes reuse through shared workspace packages.

Applications should consume shared packages instead of duplicating code.

| Package                       | Contents                                            |
| ----------------------------- | --------------------------------------------------- |
| `@school-wise/styleguide`     | Components, design tokens, icons                    |
| `@school-wise/lib-api-client` | HTTP client, auth, token refresh, session store     |
| `@school-wise/lib-types`      | Shared contracts, mirrored from backend Zod schemas |
| `@school-wise/lib-utils`      | Framework-agnostic helpers                          |
| `@school-wise/lib-hooks`      | Reusable React hooks                                |
| `@school-wise/lib-config`     | Environment configuration and feature flags         |

These packages form the foundation of the frontend platform and ensure a consistent developer experience across all applications.

---

# Styleguide

`@school-wise/styleguide` is the single design system: components, tokens, and icons in one package.

Components follow the **shadcn/ui model** — source is copied into the styleguide and owned there, not imported from a component library. Interactive primitives are built on **Radix UI**, which supplies keyboard navigation, focus management, and ARIA wiring.

Target component set:

- Button
- Input
- Textarea
- Select
- Checkbox
- Radio Group
- Switch
- Dialog
- Sheet (drawer)
- Dropdown Menu
- Popover
- Tooltip
- Toast
- Alert
- Card
- Table
- Pagination
- Avatar
- Tabs
- Breadcrumb
- Badge
- Date Picker
- File Upload
- Spinner
- Skeleton
- Empty State
- Search Input

Applications import UI components only from `@school-wise/styleguide`.

## Design tokens

Tokens are CSS custom properties in `src/global.css`, surfaced to Tailwind through `tailwind.config.ts`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;
  --border: 214 32% 91%;
  --radius: 0.5rem;
}
```

Values are stored as unquoted HSL channels so Tailwind can apply opacity modifiers (`bg-primary/50`).

This is what makes dark mode and per-school white-labeling possible without a rebuild: override the custom properties, and the whole platform reskins.

**Applications never hardcode colors.** `bg-blue-600` in an application is a defect — the token is `bg-primary`.

## Icons

Icons come from **lucide-react**, re-exported through the styleguide:

```tsx
import { UserIcon, CalendarIcon } from "@school-wise/styleguide";
```

Applications never import `lucide-react` directly. The indirection keeps the icon library replaceable.

---

# API Client

All HTTP communication passes through `@school-wise/lib-api-client`.

Responsibilities:

- Base URL from `lib-config`
- Attaching the access token
- Automatic refresh on 401, with request queueing so concurrent 401s trigger one refresh
- Error mapping to typed application errors
- Retry with backoff for idempotent requests
- Request correlation IDs for tracing

Applications never construct their own `fetch` wrappers.

## Token handling

The access token is held **in memory**, never in `localStorage` or `sessionStorage` — both are readable by any script on the origin, so an XSS becomes a full account takeover.

The refresh token is an `httpOnly` cookie that JavaScript cannot read. Refresh is a credentialed request to the backend, which reads the cookie.

On a cold page load the client has no access token. It calls refresh once; success restores the session, failure redirects to login.

> `packages/app-auth/src/auth-store.ts` currently violates this by writing a token to `localStorage`. It is a development placeholder and is deleted when this package lands. See [00-status.md](00-status.md).

---

# Types

`@school-wise/lib-types` holds contracts shared between frontend and backend.

Types are **derived from the backend's Zod schemas**, not written twice. A single definition means a backend field rename becomes a frontend type error rather than a runtime surprise.

```ts
import type { Student, CreateStudentRequest } from "@school-wise/lib-types";
```

---

# Utils

`@school-wise/lib-utils` contains reusable helpers:

- Date formatting
- Currency formatting
- Validation helpers
- Permission helpers
- File helpers
- Logger
- Debounce
- Throttle
- UUID generation

This package remains framework-agnostic — no React imports. It should be usable from a Node script.

Note the absences: no local storage helpers and no session helpers. Session handling belongs to `lib-api-client`, and `localStorage` is not where session data goes.

---

# Application Folder Structure

Every Micro Frontend should follow the same folder structure.

Consistency across applications improves maintainability and reduces onboarding time.

Example

```text
packages/app-lms/

src/

    assets/

    components/

    features/

    hooks/

    layouts/

    pages/

    routes/

    services/

    store/

    styles/

    types/

    App.tsx

    school-wise-app-lms.tsx      Single-SPA lifecycle entry point
```

Every micro frontend has two entry points:

- `App.tsx` — the React tree
- `school-wise-app-<domain>.tsx` — wraps `App` with `singleSpaReact` and exports `bootstrap`, `mount`, `unmount`

The lifecycle file must also be a **default export**, because Single-SPA loads it dynamically at runtime.

Note there is no `utils/` folder. Application-specific helpers live beside the feature that uses them; anything reusable belongs in `@school-wise/lib-utils`. A per-application `utils/` folder reliably becomes a dumping ground.

---

# Folder Responsibilities

## assets/

Contains

- Images
- Icons
- Fonts
- Static Files

---

## components/

Reusable components specific to that application.

Examples

- StudentCard
- AttendanceTable
- HomeworkCard

If a component can be reused across multiple applications, move it into `@school-wise/styleguide`.

---

## features/

Contains complete business features.

Example

```text
features/

attendance/

assignments/

dashboard/

results/
```

Each feature owns

- Components
- Hooks
- API
- State
- Types

---

## hooks/

Reusable custom React hooks.

Examples

- usePagination
- useDebounce
- useAttendance
- useStudentSearch

---

## layouts/

Application layouts.

Examples

- DashboardLayout
- AuthLayout
- BlankLayout

---

## pages/

Route-level components.

Examples

```text
pages/

Dashboard/

Attendance/

Homework/

Results/
```

Pages should remain lightweight.

Business logic belongs in features.

---

## routes/

Contains routing configuration.

Each application owns only its own routes.

---

## services/

Application-specific API services.

Uses

`@school-wise/lib-api-client`

Should never construct `fetch` wrappers directly.

---

## store/

Zustand stores for application-local client state.

Server data does not belong here — that is TanStack Query's job.

---

## styles/

Application-specific styling.

Global design tokens remain inside `@school-wise/styleguide`.

---

## types/

Application-specific interfaces.

Shared interfaces belong in

`@school-wise/lib-types`

---

# Routing Strategy

Each Micro Frontend owns its own routing.

## Route ownership is an allow-list

The shell activates an application when the URL matches one of the route prefixes that application **owns**:

```ts
const APPLICATIONS = [
  {
    name: "@school-wise/app-auth",
    routes: ["/login", "/logout", "/forgot-password"],
  },
  { name: "@school-wise/app-lms", routes: ["/lms"] },
];
```

**Never express activation as a deny-list.** `activeWhen: (loc) => !["/dashboard"].some(...)` activates the application on every route nobody has claimed — including routes added months later by another team. The auth application previously did exactly this and mounted itself across the entire site.

Route prefixes must not overlap. Two applications claiming `/reports` both mount, into the same DOM node.

## Ownership map

```text
LMS               /lms/*
Teacher           /teacher/*
Principal         /principal/*
Administration    /admin/*
Monitoring        /monitoring/*
Auth              /login, /logout, /forgot-password, /reset-password
```

Within its prefix, an application routes freely with React Router:

```text
LMS

/lms/dashboard

/lms/homework

/lms/attendance

/lms/results

/lms/profile
```

Teacher

```text
/teacher/dashboard

/teacher/students

/teacher/attendance

/teacher/assignments

/teacher/timetable
```

Administration

```text
/admin/dashboard

/admin/students

/admin/teachers

/admin/users

/admin/classes

/admin/settings
```

Applications should never define routes belonging to another application.

---

# Root Routing

The Root Application is responsible for:

- Authentication
- Loading applications
- Role validation
- Global navigation

Example

```text
/

↓

Authentication

↓

Resolve User

↓

Resolve Roles

↓

Load Allowed Applications

↓

Redirect to Default Workspace
```

---

# Role-Based Routing

Routing is driven by permissions returned from the backend.

Example

Student

Available

- LMS

Teacher

Available

- Teacher

Principal

Available

- Principal
- Teacher
- LMS

Administrator

Available

- Administration
- Principal
- Teacher
- LMS

Monitoring

Available

- Monitoring
- Administration
- Principal
- Teacher
- LMS

Super Administrator

Everything

---

# Workspace Switching

Some users may have multiple roles.

Example

Principal

-

Administrator

The Root Application should display a Workspace Switcher.

Users can switch between workspaces without logging out.

This should not require re-authentication.

---

# Navigation

Navigation should be dynamically generated.

Never hardcode navigation.

Navigation should depend on

- User Role
- Permissions
- Feature Flags

Future modules automatically appear when enabled.

---

# State Management Strategy

SchoolWise follows a layered state management approach.

## Local State

Use React hooks.

Examples

- Dialog State
- Form State
- Selected Row
- Filters

---

## Global State

Use Zustand, only when necessary.

Examples

- Auth User
- Theme
- Notifications
- Application Settings

Avoid storing temporary UI state globally.

The session store lives in `@school-wise/lib-api-client` so every micro frontend reads one session. Application-specific stores stay in the application.

---

## Server State

Use TanStack Query. Server remains the source of truth.

Benefits

- Automatic caching
- Refetching
- Loading states
- Error handling
- Request deduplication

**Server data does not go into Zustand.** Copying it into a client store creates a second source of truth that immediately begins drifting from the server.

Each micro frontend owns its own `QueryClient`. A shared client across Single-SPA boundaries would mean one application's cache invalidation affecting another's, which reintroduces exactly the coupling runtime composition is meant to avoid.

Query keys are tenant-prefixed, so a school switch cannot serve the previous school's cached data:

```ts
queryKey: ["school", schoolId, "students", { page, filters }];
```

---

# Component Design Principles

Components should follow:

- Single Responsibility
- Composition over Inheritance
- Reusability
- Predictability
- Accessibility

Avoid massive components.

If a component exceeds roughly 300 lines, consider splitting it.

---

# Component Categories

## Shared Components

Located in

`@school-wise/styleguide`

Reusable everywhere.

---

## Feature Components

Reusable within one feature.

Example

Attendance Table

Assignment Card

Student List

---

## Page Components

Represent complete routes.

Pages compose feature components.

They should contain very little business logic.

---

# Forms

Recommended

- React Hook Form
- Zod Validation

Validation should exist both:

Frontend

AND

Backend

Frontend improves UX.

Backend guarantees correctness.

---

# API Communication

Applications communicate only through:

`@school-wise/lib-api-client`

Never create custom fetch wrappers inside applications.

Benefits

- Authentication
- Retry
- Logging
- Error Mapping
- Consistency

---

# Loading Strategy

Every application should support:

- Skeleton Loading
- Progressive Rendering
- Optimistic Updates (where appropriate)
- Lazy Loading

Avoid blank pages during loading.

---

# Code Splitting

Every major route should be lazy loaded.

Example

Dashboard

Attendance

Homework

Reports

Assignments

Benefits

- Faster startup
- Smaller bundles
- Better performance

---

# Performance Guidelines

Prefer:

- React.memo
- useMemo
- useCallback

only after measuring performance.

Avoid premature optimization.

---

# Virtualization

Large datasets should use virtualization.

Examples

- Student Lists
- Attendance
- Reports
- Audit Logs

Avoid rendering thousands of DOM nodes simultaneously.

---

# Error Boundaries

Every application should include:

Application-level Error Boundary

Feature-level Error Boundary (where appropriate)

The Root Application should catch catastrophic failures.

---

# Notifications

Global notifications should be managed centrally.

Recommended types

- Success
- Error
- Warning
- Information

Applications should use a shared notification service.

---

# Accessibility

Every UI component should support:

- Keyboard navigation
- Screen readers
- Proper labels
- Focus management
- Color contrast
- ARIA attributes

Accessibility is a core requirement, not an optional enhancement.

---

# Responsive Design

Support:

Desktop

Tablet

Mobile

Large Desktop

Breakpoints are defined once in the styleguide's Tailwind config. Applications use Tailwind's responsive utilities and never declare their own media queries.

---

# Internationalization

The frontend should be designed for i18n from the beginning.

Avoid hardcoded strings.

Use translation keys.

Example

```text
dashboard.title

attendance.present

attendance.absent
```

This simplifies future language support.

---

# Theme Strategy

Support future themes.

Examples

- Light
- Dark
- School Branding
- White Label Themes

All design tokens should originate from `@school-wise/styleguide`.

Applications should never hardcode colors.

Because tokens are CSS custom properties, a theme change is a variable override rather than a rebuild. Per-school branding is served as a small stylesheet derived from that school's configuration.

---

# Security Guidelines

**Never store tokens in `localStorage` or `sessionStorage`.** Both are readable by any script on the origin, which turns any XSS into a full account takeover. The access token is held in memory; the refresh token is an `httpOnly` cookie.

Also required:

- Permission validation for navigation and actions
- Protected routes
- No secrets in frontend environment variables — anything bundled is public
- No rendering of unsanitized HTML; avoid `dangerouslySetInnerHTML`

Frontend permission checks are a **user experience affordance**. They hide what a user cannot do; they do not prevent it. Anyone can call the API directly.

The backend always remains the source of truth for authorization.

---

# Frontend Principles Checklist

Every frontend contribution should satisfy the following:

- Follows shared design system
- Uses shared libraries
- No duplicate utilities
- Strong typing
- Accessible UI
- Responsive design
- Lazy-loaded routes
- Minimal global state
- Backend-first security
- Clear ownership of business logic

These principles ensure SchoolWise remains scalable, maintainable, and consistent as new teams and new modules are added.

---

# Naming Conventions

Consistency across applications is mandatory.

## Components

Use **PascalCase**.

Examples

```tsx
StudentCard.tsx;
AttendanceTable.tsx;
TeacherProfile.tsx;
AssignmentDialog.tsx;
```

---

## Hooks

Prefix every custom hook with **use**.

Examples

```tsx
useAuth.ts;

useAttendance.ts;

useStudents.ts;

usePagination.ts;
```

---

## Pages

Use PascalCase.

```text
Dashboard

Attendance

StudentProfile

Homework
```

---

## Features

Use lowercase folders.

```text
attendance

assignments

dashboard

results
```

---

## API Services

Suffix with **Service**.

Examples

```text
student.service.ts

attendance.service.ts

teacher.service.ts
```

---

## Zustand Stores

Suffix with **Store**.

Examples

```text
authStore.ts

notificationStore.ts

preferencesStore.ts
```

---

# Import Order

Imports should always follow this order.

1. React
2. External Libraries
3. Shared Packages
4. Application Services
5. Hooks
6. Components
7. Types
8. Styles

Example

```tsx
import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@school-wise/styleguide";

import { getStudents } from "../services/student.service";

import { useStudents } from "../hooks/useStudents";

import StudentTable from "../components/StudentTable";

import type { Student } from "@school-wise/lib-types";
```

Enforced automatically by `eslint-plugin-import`, not by review.

---

# Environment Configuration

Every application should consume configuration from `@school-wise/lib-config`.

Do not hardcode values.

Examples

- API Base URL
- Feature Flags
- Environment
- Build Metadata
- Analytics Keys

Example

```ts
config.api.baseUrl;

config.auth.loginUrl;

config.environment;
```

---

# Feature Flags

New functionality should support feature flags.

Examples

```text
AI Features

Live Chat

Parent Portal

Online Exams

Library Module
```

Feature flags allow controlled rollouts without redeploying the application.

---

# Logging Strategy

Applications should never use `console.log()` in production code.

Use a centralized logging utility.

Supported log levels:

- Debug
- Information
- Warning
- Error

Future integrations may include:

- OpenTelemetry
- Sentry
- Datadog
- Azure Monitor

---

# Error Handling

All API errors should flow through the shared API client.

The UI should present friendly, actionable messages rather than raw server responses.

Examples

- Validation errors
- Authentication failures
- Authorization failures
- Network errors
- Timeout errors
- Unexpected server errors

Global error handling should be consistent across all applications.

---

# Authentication Flow

```text
User

↓

Login

↓

Authentication Application

↓

NestJS Backend

↓

JWT + Refresh Token

↓

Root Application

↓

Resolve User Profile

↓

Resolve Roles

↓

Load Accessible Applications

↓

Render Workspace
```

Authentication is centralized.

Applications consume the authenticated context and should never implement their own login logic.

---

# Authorization Strategy

The frontend reflects permissions returned by the backend.

Responsibilities of the frontend:

- Hide unauthorized navigation items
- Protect routes
- Disable restricted actions
- Display an "Unauthorized" page when appropriate

Responsibilities of the backend:

- Validate JWT
- Validate roles
- Validate permissions
- Enforce access control

The backend is always the source of truth.

---

# Communication Between Applications

Micro frontends must remain isolated.

Applications should not import code from other applications.

Communication should occur through:

- Shared libraries
- Public backend APIs
- Shared event contracts (future)

Direct application-to-application dependencies are prohibited.

---

# Build Strategy

Each micro frontend must be independently buildable.

```bash
turbo build --filter=@school-wise/app-lms

turbo build --filter=@school-wise/app-teacher

turbo build --filter=@school-wise/root-config
```

Turborepo builds dependencies first — the styleguide before its consumers — and caches results, so unchanged packages are not rebuilt.

## Externals are mandatory

Every micro frontend must mark shared runtime dependencies as external:

```ts
build: {
  rollupOptions: {
    external: ["react", "react-dom", "single-spa", "@school-wise/styleguide"],
  },
}
```

These are provided at runtime through the shell's import map. Bundling React into a micro frontend produces a second React instance, and hooks break at runtime with **no build error**. This is the single most common way to break a Single-SPA application.

---

# Deployment Strategy

Each frontend application is deployed independently, and Single-SPA composes them at runtime.

```text
root-config          →  static host  (owns the import map)
app-auth             →  static host
app-lms              →  static host
app-teacher          →  static host
app-principal        →  static host
app-administration   →  static host
app-monitoring       →  static host
```

## Managing version skew

Independent deployment means an application can be deployed against a styleguide version it was never built against. Required practice:

- **Immutable, versioned artifact URLs** — `/styleguide/1.4.2/school-wise-styleguide.js`, never a mutable `latest`
- The shell's import map pins exact versions; a styleguide upgrade is a **deliberate shell deployment**, not an ambient change
- Breaking styleguide changes require a major version, and consumers migrate before the import map moves
- Roll back by reverting the import map, which is faster than redeploying an application

## Deployment order

1. Deploy new `styleguide` version to its own immutable URL — nothing consumes it yet
2. Deploy micro frontends built against it
3. Update the shell import map — this is the atomic cutover

Rollback is step 3 in reverse.

---

# Continuous Integration

Every pull request should execute:

- Type checking
- ESLint (including boundary rules)
- Unit tests
- Build validation
- Single-SPA lifecycle contract test

Turborepo's filtering runs only what a change affects:

```bash
turbo lint typecheck test build --filter="...[origin/main]"
```

## Lifecycle contract test

Every micro frontend build is verified to export valid `bootstrap`, `mount`, and `unmount` functions plus a default export. A build that produces a module Single-SPA cannot mount otherwise fails at runtime in production, with no earlier signal.

---

# Testing Strategy

## Unit Tests

Focus on:

- Components
- Hooks
- Utility functions
- Reducers

Recommended tools:

- Vitest
- React Testing Library

---

## Integration Tests

Verify:

- Feature workflows
- API interactions
- Routing
- State updates

---

## End-to-End Tests

Cover complete user journeys such as:

- Login
- Student attendance
- Assignment submission
- Teacher grading
- Administrative user management

Recommended tool:

- Playwright

---

# Performance Goals

Frontend targets:

- Fast initial load
- Route-level code splitting
- Lazy loading
- Optimized bundle size
- Efficient rendering
- Minimal unnecessary re-renders

Performance should be measured using real metrics rather than assumptions.

---

# Accessibility Goals

SchoolWise aims to meet WCAG 2.1 AA guidelines.

Key requirements:

- Keyboard accessibility
- Focus management
- Screen reader compatibility
- Semantic HTML
- Adequate color contrast
- Accessible forms and dialogs

Accessibility should be validated during development and testing.

---

# Code Review Checklist

Every pull request should confirm:

- Uses shared libraries where appropriate
- Follows naming conventions
- Includes TypeScript typings
- Avoids duplicated code
- Uses reusable components
- Handles loading and error states
- Includes tests when required
- Updates documentation if architecture changes

---

# Future Frontend Enhancements

The frontend architecture is designed to support future capabilities without major restructuring.

Planned enhancements include:

- Progressive Web App (PWA)
- Offline mode
- Push notifications
- Multi-language support (i18n)
- White-label themes
- Dynamic branding
- AI-powered dashboards
- AI-assisted forms
- Real-time collaboration
- WebSocket integration
- React Native mobile applications
- Plugin architecture for third-party extensions

---

# Frontend Architecture Summary

The SchoolWise frontend is built around the following principles:

- Domain-driven micro frontends
- Bun workspaces + Turborepo
- Single-SPA runtime orchestration
- Shared packages for reuse
- Backend-first security
- Role-based application access
- Centralized authentication
- Tokens in memory, never in web storage
- Consistent design system driven by CSS custom properties
- Independent deployments with pinned import map versions
- Long-term maintainability

Every architectural decision should reinforce these principles and avoid introducing unnecessary coupling between applications.

---

# References

- [README.md](../README.md)
- [00-status.md](00-status.md) — what actually exists
- [01-architecture.md](01-architecture.md)
- [03-backend.md](03-backend.md)
- [04-development-guidelines.md](04-development-guidelines.md)
- [05-roadmap.md](05-roadmap.md)
- [06-multi-tenancy.md](06-multi-tenancy.md)
- [adr/](adr/README.md)

This document, together with the rest of the architecture documentation, forms the authoritative reference for all frontend development within the SchoolWise platform.
