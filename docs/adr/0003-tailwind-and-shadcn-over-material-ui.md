# ADR-0003 — Tailwind + shadcn/ui, no Material UI

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

The original documentation specified **both** Material UI and Tailwind CSS, with `@schoolwise/ui` wrapping MUI components and `@schoolwise/icons` re-exporting MUI icons.

The implemented styleguide uses neither of those. It is Tailwind-only, with a hand-written `Button` following the shadcn/ui pattern and CSS custom properties (`--background`, `--primary`) for theming.

Running Material UI and Tailwind together in the same application is a known source of ongoing friction:

- Two competing sources of truth for spacing, color, and typography tokens
- Emotion's runtime-injected styles versus Tailwind's build-time atomic classes, with unpredictable cascade order
- Utility classes losing to MUI's generated selectors, driving `!important` into the codebase
- Roughly 90–140 KB gzipped of MUI plus Emotion, on top of Tailwind

## Decision

**Tailwind CSS + shadcn/ui only.** Material UI is removed from the stack.

- `@school-wise/styleguide` owns all shared components, built on **Radix UI primitives** for accessibility behavior and styled with Tailwind
- Components are **copied into** the styleguide, not imported from a package — the shadcn/ui model. The styleguide owns the source.
- Icons come from **lucide-react**, re-exported through the styleguide so the underlying library stays replaceable
- Design tokens are CSS custom properties in `global.css`, consumed by `tailwind.config.ts`

## Alternatives Considered

**Material UI only, drop Tailwind.** A defensible choice — MUI is comprehensive and mature. Rejected: the existing styleguide would be discarded, and MUI's theming is harder to drive from CSS custom properties, which matters for the white-label branding on the roadmap.

**Keep both as documented.** Rejected for the reasons above. This combination has no upside that either library alone does not provide.

## Consequences

- Radix supplies keyboard navigation, focus management, and ARIA wiring for interactive primitives. The WCAG 2.1 AA target is not reachable with hand-rolled dialogs and menus.
- Components MUI provides out of the box — data grid, date picker, autocomplete — must be sourced individually. Data tables use **TanStack Table**; date pickers use **react-day-picker**.
- Theming and white-labeling become straightforward: overriding CSS custom properties reskins the platform with no rebuild.
- The styleguide carries more code, since components are owned rather than imported. This is the deliberate trade — full control over markup and behavior.
- Documentation referencing `@mui/material`, `@schoolwise/ui`, or `@schoolwise/icons` is obsolete and has been corrected.
