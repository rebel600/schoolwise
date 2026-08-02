import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import vitePluginSingleSpa from "vite-plugin-single-spa";

import {
  SHARED_EXTERNALS,
  SHARED_RUNTIME_MODULES,
  sharedRuntimeModules,
} from "../../vite.shared-modules";

export default defineConfig({
  plugins: [
    sharedRuntimeModules(),
    react(),
    vitePluginSingleSpa({
      type: "mife",
      serverPort: 4002,
      projectId: "school-wise-app-auth",
      spaEntryPoints: "src/school-wise-app-auth.tsx",
    }),
  ],
  server: { port: 4002, strictPort: true, cors: true },
  build: {
    rollupOptions: {
      /* Provided at runtime through the shell's import map. */
      external: SHARED_EXTERNALS,
    },
  },
  optimizeDeps: {
    exclude: Object.keys(SHARED_RUNTIME_MODULES),
  },
});
