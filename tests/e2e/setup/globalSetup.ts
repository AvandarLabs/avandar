import path from "node:path";
import { config } from "dotenv";
import { ensureE2EViteFeatureFlags } from "./ensureE2EViteFeatureFlags";

/**
 * Loads `.env.development` from the repository root so Playwright and the
 * webServer can read `VITE_*` and `SUPABASE_*` values.
 */
function _loadDevelopmentEnv(): void {
  config({ path: path.resolve(process.cwd(), ".env.development") });
  ensureE2EViteFeatureFlags();
}

/**
 * Runs once before the Playwright webserver and tests. Auth users and the
 * shared workspace are created in the worker-scoped `e2eWorkerDb` fixture.
 */
export default async function globalSetup(): Promise<void> {
  _loadDevelopmentEnv();
}
