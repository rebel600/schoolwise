import { defineConfig } from "vite";
import vitePluginSingleSpa from "vite-plugin-single-spa";

import {
  SHARED_EXTERNALS,
  SHARED_RUNTIME_MODULES,
  sharedRuntimeModules,
} from "../../vite.shared-modules";

export default defineConfig({
  plugins: [
    /*
     * The shell needs this too. It imports lib-api-client to resolve the
     * session before activating an application, and without the rewrite it
     * would load its own filesystem copy — a different token store from the
     * one the micro frontends use.
     */
    sharedRuntimeModules(),
    vitePluginSingleSpa({
      type: "root",
      imo: "3.1.1", // Installs import-map-overrides automation engines
    }),
  ],
  build: {
    rollupOptions: { external: SHARED_EXTERNALS },
  },
  server: { port: 9000, strictPort: true },
  optimizeDeps: {
    exclude: [...Object.keys(SHARED_RUNTIME_MODULES), "@school-wise/app-auth"],
  },
});
