import path from "node:path";
import { config } from "dotenv";
import { ensureTestUser } from "./ensureTestUser";

/**
 * Loads `.env.development` from the repository root so global setup and the
 * Playwright config can read `VITE_*` and `SUPABASE_*` values.
 */
function _loadDevelopmentEnv(): void {
  config({ path: path.resolve(process.cwd(), ".env.development") });
}

/**
 * Runs once before the Playwright webserver and tests. Ensures the primary
 * auth user exists. Each test provisions its own `e2e-test-workspace` via the
 * E2E fixture.
 */
export default async function globalSetup(): Promise<void> {
  _loadDevelopmentEnv();
  await ensureTestUser();
}
