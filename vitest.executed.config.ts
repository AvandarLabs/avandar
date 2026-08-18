import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest project for tests that execute real SQL. Separate from the default
 * jsdom project because DuckDB cannot run under jsdom.
 *
 * This does not reuse `./tests/vitest.setup.ts`: that file touches DOM
 * globals (`window.matchMedia`, `window.ResizeObserver`, jest-dom matchers,
 * React Testing Library cleanup) that do not exist under `environment:
 * "node"`. Instead `./tests/vitest.executed.setup.ts` carries over only the
 * runtime-independent parts, loading `.env.development` and defining the
 * `toHaveSameMembers` matcher, so a later executed test can still use them.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: "./tests/vitest.executed.setup.ts",
    include: ["**/*.executed.test.ts"],
    exclude: ["node_modules/**", "apps/**", "packages/**", "tests/e2e/**"],
  },
});
