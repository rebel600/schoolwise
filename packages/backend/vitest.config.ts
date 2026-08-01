import { defineConfig, mergeConfig } from "vitest/config";

import shared from "../../vitest.shared.ts";

export default mergeConfig(
  shared,
  defineConfig({
    test: {
      /* Node, not jsdom — this package has no DOM. */
      environment: "node",
      setupFiles: [],
      /* PGlite instantiates a WASM Postgres per suite. */
      testTimeout: 30_000,
      hookTimeout: 60_000,
    },
  }),
);
