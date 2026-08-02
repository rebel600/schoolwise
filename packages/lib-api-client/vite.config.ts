import { defineConfig } from "vite";
import vitePluginSingleSpa from "vite-plugin-single-spa";

/**
 * Built and served like the styleguide, NOT bundled into each application.
 *
 * This package owns the in-memory access token and the session store. If
 * every micro frontend bundled its own copy, each would hold a SEPARATE
 * token and a separate store — signing in inside one application would leave
 * the others signed out.
 *
 * Shared session state therefore requires a single runtime instance, which
 * means an import map entry and `external` in every consumer.
 */
export default defineConfig({
  plugins: [
    vitePluginSingleSpa({
      type: "mife",
      serverPort: 4008,
      projectId: "school-wise-lib-api-client",
      spaEntryPoints: "src/index.ts",
    }),
  ],
  server: { port: 4008, strictPort: true, cors: true },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "school-wise-lib-api-client.js",
    },
    rollupOptions: {
      /* zustand is bundled in — it is an implementation detail of this
         package, not a shared runtime singleton. */
      external: ["react", "react-dom"],
    },
  },
});
