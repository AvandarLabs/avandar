import { test as base } from "@playwright/test";
import {
  provisionFreshPrimaryUserE2ETestWorkspace,
  teardownPrimaryUserE2ETestWorkspace,
} from "../setup/e2eTestWorkspaceLifecycle";

export { expect } from "@playwright/test";

type E2EWorkspaceFixtures = {
  _e2eIsolatedWorkspace: undefined;
};

/**
 * Playwright `test` with an auto fixture that provisions the primary user's
 * `e2e-test-workspace` before each test and deletes it after.
 */
export const test = base.extend<E2EWorkspaceFixtures>({
  _e2eIsolatedWorkspace: [
    // Playwright requires object destructuring on the fixtures argument.
    // eslint-disable-next-line no-empty-pattern -- no injected fixtures used
    async ({}, use) => {
      await provisionFreshPrimaryUserE2ETestWorkspace();
      await use(undefined);
      await teardownPrimaryUserE2ETestWorkspace();
    },
    { auto: true },
  ],
});
