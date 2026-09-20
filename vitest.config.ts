import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["{apps,packages}/**/src/**/*.test.ts"],
    setupFiles: ["apps/api/src/tests/setup.ts"]
  }
});
