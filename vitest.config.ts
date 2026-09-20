import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["**/*.test.ts"],
    setupFiles: ["apps/api/src/tests/setup.ts"]
  }
});
