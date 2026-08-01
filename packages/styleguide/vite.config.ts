import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vitePluginSingleSpa from "vite-plugin-single-spa";

export default defineConfig({
  plugins: [
    react(),
    vitePluginSingleSpa({
      type: "mife",
      serverPort: 4001,
      projectId: "school-wise-styleguide",
      spaEntryPoints: "src/school-wise-styleguide.tsx",
    }),
  ],
  server: {
    port: 4001,
    strictPort: true,
    cors: true,
  },
});
