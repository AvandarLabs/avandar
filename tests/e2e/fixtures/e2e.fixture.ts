import { test as base } from "@playwright/test";
import { cleanupTestUser } from "../helpers/cleanupTestUser";
import { createSupabaseAdminClient } from "../helpers/supabaseAdminClient";
import {
  E2E_PRIMARY_USER_EMAIL,
  E2E_SECONDARY_USER_EMAIL,
  E2E_TEST_USER_PASSWORD,
  E2E_WORKSPACE_SLUG_BASE,
} from "../setup/e2e-credentials";
import {
  provisionFreshE2EWorkspaceForOwner,
  purgeE2EWorkspacesForOwner,
} from "../setup/e2eTestWorkspaceLifecycle";
import { ensureAuthUserExists } from "../setup/ensureAuthUser";

export { expect } from "@playwright/test";

export type E2EWorkerCredentials = Readonly<{
  email: string;
  password: string;
}>;

/**
 * Shared worker database state: two auth users and one owned workspace slug.
 */
export type E2EWorkerDb = Readonly<{
  workspaceSlug: string;
  primaryUser: E2EWorkerCredentials;
  secondaryUser: E2EWorkerCredentials;
}>;

type E2EWorkerFixtures = {
  e2eWorkerDb: E2EWorkerDb;
};

/**
 * Base E2E `test` with a worker-scoped DB fixture: creates dedicated auth
 * users, provisions the shared workspace once per worker, and purges
 * workspace data plus auth users when the worker shuts down.
 */
export const test = base.extend<Record<never, never>, E2EWorkerFixtures>({
  e2eWorkerDb: [
    async ({}, use, workerInfo) => {
      const workspaceSlug = `${E2E_WORKSPACE_SLUG_BASE}-w${workerInfo.workerIndex}`;
      const primaryUser: E2EWorkerCredentials = {
        email: E2E_PRIMARY_USER_EMAIL,
        password: E2E_TEST_USER_PASSWORD,
      };
      const secondaryUser: E2EWorkerCredentials = {
        email: E2E_SECONDARY_USER_EMAIL,
        password: E2E_TEST_USER_PASSWORD,
      };
      const state: E2EWorkerDb = {
        workspaceSlug,
        primaryUser,
        secondaryUser,
      };

      await ensureAuthUserExists(primaryUser);
      await ensureAuthUserExists(secondaryUser);
      await provisionFreshE2EWorkspaceForOwner({
        ownerEmail: primaryUser.email,
        workspaceSlug,
      });

      await use(state);

      try {
        const admin = createSupabaseAdminClient();
        await purgeE2EWorkspacesForOwner({
          supabaseAdminClient: admin,
          ownerEmail: primaryUser.email,
          workspaceSlug,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[e2e] worker workspace purge: ${message}`);
      }

      await cleanupTestUser(primaryUser.email);
      await cleanupTestUser(secondaryUser.email);
    },
    { auto: true, scope: "worker" },
  ],
});
