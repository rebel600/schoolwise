import { defineConfig } from "vite";
import vitePluginSingleSpa from "vite-plugin-single-spa";

export default defineConfig({
  plugins: [
    vitePluginSingleSpa({
      type: "root",
      imo: "3.1.1", // Installs import-map-overrides automation engines
    }),
  ],
  server: {
    port: 9000,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ["@school-wise/styleguide", "@school-wise/app-auth"],
  },
});
