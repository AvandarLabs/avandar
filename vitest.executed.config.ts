import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest project for tests that execute real SQL. Separate from the default
 * jsdom project because DuckDB cannot run under jsdom.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.executed.test.ts"],
    exclude: ["node_modules/**", "apps/**", "packages/**", "tests/e2e/**"],
  },
});
