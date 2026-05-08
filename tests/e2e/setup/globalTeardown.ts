import path from "node:path";
import { config } from "dotenv";
import { teardownPrimaryUserE2ETestWorkspace } from "./e2eTestWorkspaceLifecycle";

/**
 * Loads `.env.development` from the repository root (same as global setup).
 */
function _loadDevelopmentEnv(): void {
  config({ path: path.resolve(process.cwd(), ".env.development") });
}

/**
 * Runs once after all tests to remove a leftover `e2e-test-workspace` if the
 * last run stopped mid-test.
 */
export default async function globalTeardown(): Promise<void> {
  _loadDevelopmentEnv();
  await teardownPrimaryUserE2ETestWorkspace();
}
