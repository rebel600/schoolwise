import type { Plugin } from "vite";

/**
 * Packages that must exist EXACTLY ONCE at runtime.
 *
 * `styleguide` — one copy of the design tokens and component styles.
 *
 * `lib-api-client` — owns the in-memory access token and the session store.
 * A second instance means a second session: signing in inside one micro
 * frontend would leave the others signed out.
 *
 * In production these are resolved from the shell's import map, and each
 * consumer marks them `external`.
 *
 * In DEVELOPMENT that is not enough. Vite resolves a bare specifier for a
 * workspace dependency straight to the filesystem (`/@fs/...`), ignoring the
 * import map entirely. Because each dev server has its own origin, app-auth
 * would load `http://localhost:4002/@fs/.../lib-api-client` while the shell
 * loaded `http://localhost:9000/@fs/.../lib-api-client` — two module
 * instances, two token stores, and a login that appears not to work.
 *
 * The plugin below rewrites those specifiers to the single canonical dev URL.
 *
 * Defined once, here, rather than copied into each vite.config.ts — a
 * per-package copy is exactly how one of them ends up missing an entry.
 */
export const SHARED_RUNTIME_MODULES = {
  "@school-wise/styleguide":
    "http://localhost:4001/src/school-wise-styleguide.tsx",
  "@school-wise/lib-api-client": "http://localhost:4008/src/index.ts",
} as const;

export const SHARED_EXTERNALS = [
  "react",
  "react-dom",
  "single-spa",
  ...Object.keys(SHARED_RUNTIME_MODULES),
];

/**
 * Rewrites shared-module imports to their canonical dev-server URL, so every
 * package in the workspace loads the same instance.
 */
export function sharedRuntimeModules(): Plugin {
  const prefix = "\0shared-runtime-module:";

  return {
    name: "shared-runtime-modules",
    apply: "serve",
    /* `pre` so this wins before Vite's own workspace resolution. */
    enforce: "pre",

    resolveId(id) {
      if (id in SHARED_RUNTIME_MODULES) {
        return `${prefix}${id}`;
      }
      return undefined;
    },

    load(id) {
      if (!id.startsWith(prefix)) return undefined;

      const name = id.slice(
        prefix.length,
      ) as keyof typeof SHARED_RUNTIME_MODULES;

      /*
       * `export *` only — neither shared module has a default export.
       * Re-exporting one would be a build error. Single-SPA lifecycle
       * modules DO have defaults, but those are apps, not shared libraries,
       * and are never routed through here.
       */
      return `export * from ${JSON.stringify(SHARED_RUNTIME_MODULES[name])};`;
    },
  };
}
