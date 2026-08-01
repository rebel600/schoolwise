import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * SchoolWise ESLint configuration.
 *
 * The boundary rules below are the mechanical enforcement of the module
 * boundaries described in docs/01-architecture.md. Nx would have provided this
 * via @nx/enforce-module-boundaries; see docs/adr/0002-bun-workspaces-and-turborepo.md.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/tailwind-gen.css",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },

      /* Without a TypeScript-aware resolver, extensionless `.ts` imports do
         not resolve, and both import/order and the boundary rules below
         silently skip them — passing on violations they should catch. */
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["packages/*/tsconfig.json"],
          noWarnOnMultipleProjects: true,
        },
      },

      /* ---------------------------------------------------------------
       * Package roles, derived from directory name.
       * Keep in sync with the table in docs/01-architecture.md.
       *
       * `capture` records WHICH app/lib a file belongs to, so the policies
       * below can permit an app to import its own files while blocking
       * imports from a sibling app.
       * ------------------------------------------------------------- */
      "boundaries/elements": [
        { type: "shell", pattern: "packages/root-config" },
        { type: "app", pattern: "packages/app-*", capture: ["appName"] },
        { type: "styleguide", pattern: "packages/styleguide" },
        { type: "lib", pattern: "packages/lib-*", capture: ["libName"] },
        { type: "backend", pattern: "packages/backend" },
      ],
      "boundaries/include": ["packages/**/*.{ts,tsx}"],
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
      boundaries,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,

      /* Unused vars: allow deliberate `_`-prefixed escapes. */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      /* docs/04-development-guidelines.md: avoid `any`, prefer `unknown`. */
      "@typescript-eslint/no-explicit-any": "error",

      /* docs/02-frontend.md: no console.log in committed code. */
      "no-console": ["error", { allow: ["warn", "error"] }],

      /* docs/02-frontend.md — Import Order. */
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            { pattern: "react", group: "builtin", position: "before" },
            { pattern: "@school-wise/**", group: "internal" },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      /* ---------------------------------------------------------------
       * Module boundaries.
       *
       * The key rule: an app may never import another app, and nothing
       * may import an app. Micro frontends communicate through shared
       * packages and the backend API only.
       * ------------------------------------------------------------- */
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "Boundary violation: '{{from.element.type}}' may not import '{{to.element.type}}' — see the boundary table in docs/01-architecture.md.",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["styleguide", "lib"] },
                  },
                },
              },
            },
            {
              /* Imports within one app are implicitly allowed (same element).
                 This policy exists only to give the cross-app case a message
                 clearer than "'app' may not import 'app'". */
              from: { element: { type: "app" } },
              disallow: { to: { element: { type: "app" } } },
              message:
                "An app must never import another app's internals. Micro frontends communicate through shared packages (styleguide, lib-*) or the backend API — see docs/01-architecture.md.",
            },
            {
              from: { element: { type: "shell" } },
              allow: { to: { element: { type: "shell" } } },
              message:
                "The shell composes apps at runtime via the import map. It must not import them at build time.",
            },
            {
              from: { element: { type: "styleguide" } },
              allow: {
                to: { element: { types: { anyOf: ["styleguide", "lib"] } } },
              },
            },
            {
              from: { element: { type: "lib" } },
              allow: { to: { element: { type: "lib" } } },
            },
            {
              from: { element: { type: "backend" } },
              allow: {
                to: { element: { types: { anyOf: ["backend", "lib"] } } },
              },
            },
          ],
        },
      ],
    },
  },

  /* An app importing its OWN files is `from: app` to `to: app`, which the
     rule above permits. Cross-app imports are blocked by no-private, since
     another app's internals are private to it. */

  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  prettier,
);
