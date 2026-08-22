import { config } from "dotenv";
import path from "node:path";

import {
  E2E_PRIMARY_USER_EMAIL,
  E2E_SECONDARY_USER_EMAIL,
} from "./e2e-credentials";
import { bestEffortPurgeE2EWorkspacesForOwners } from "./e2eTestWorkspaceLifecycle";

/**
 * Loads `.env.development` from the repository root (same as global setup).
 */
function _loadDevelopmentEnv(): void {
  config({ path: path.resolve(process.cwd(), ".env.development") });
}

/**
 * Runs once after all tests. Removes leftover E2E workspaces if the prior
 * run exited without worker teardown (crash, SIGKILL, etc.).
 */
export default async function globalTeardown(): Promise<void> {
  _loadDevelopmentEnv();
  await bestEffortPurgeE2EWorkspacesForOwners({
    ownerEmails: [E2E_PRIMARY_USER_EMAIL, E2E_SECONDARY_USER_EMAIL],
  });
}
