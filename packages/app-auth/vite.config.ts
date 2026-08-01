import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import vitePluginSingleSpa from "vite-plugin-single-spa";

const devRemoteModules = {
  "@school-wise/styleguide":
    "http://localhost:4001/src/school-wise-styleguide.tsx",
} as const;

function devRemoteModuleProxy(): Plugin {
  const prefix = "\0dev-remote-module:";

  return {
    name: "dev-remote-module-proxy",
    apply: "serve",
    enforce: "pre",
    resolveId(id) {
      if (id in devRemoteModules) {
        return `${prefix}${id}`;
      }
    },
    load(id) {
      if (id.startsWith(prefix)) {
        const moduleName = id.slice(
          prefix.length,
        ) as keyof typeof devRemoteModules;
        return `export * from ${JSON.stringify(devRemoteModules[moduleName])};`;
      }
    },
  };
}

export default defineConfig({
  plugins: [
    devRemoteModuleProxy(),
    react(),
    vitePluginSingleSpa({
      type: "mife",
      serverPort: 4002,
      projectId: "school-wise-app-auth",
      spaEntryPoints: "src/school-wise-app-auth.tsx",
    }),
  ],
  server: {
    port: 4002,
    strictPort: true,
    cors: true,
  },
  build: {
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "single-spa",
        "@school-wise/styleguide", // Crucial: prevents the normalizeUrl crash!
      ],
    },
  },
  optimizeDeps: {
    exclude: ["@school-wise/styleguide"],
  },
});
