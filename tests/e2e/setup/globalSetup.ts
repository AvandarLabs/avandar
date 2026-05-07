import path from "node:path";
import { config } from "dotenv";
import { ensureTestUser } from "./ensureTestUser";
import { ensureWorkspaceSubscriptionForE2E } from "./ensureWorkspaceSubscriptionForE2E";

/**
 * Loads `.env.development` from the repository root so global setup and the
 * Playwright config can read `VITE_*` and `SUPABASE_*` values.
 */
function _loadDevelopmentEnv(): void {
  config({ path: path.resolve(process.cwd(), ".env.development") });
}

/**
 * Runs once before the Playwright webserver and tests. Seeds auth and billing
 * rows needed for local E2E against Supabase.
 */
export default async function globalSetup(): Promise<void> {
  _loadDevelopmentEnv();
  await ensureTestUser();
  await ensureWorkspaceSubscriptionForE2E();
}
