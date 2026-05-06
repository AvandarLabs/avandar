import { ensureTestUser } from "./setup/ensureTestUser";
import { ensureWorkspaceSubscriptionForE2E } from "./setup/ensureWorkspaceSubscriptionForE2E";
import { loadDevelopmentEnv } from "./setup/load-env";

/**
 * Runs once before the Playwright webserver and tests. Seeds auth and billing
 * rows needed for local E2E against Supabase.
 */
export default async function globalSetup(): Promise<void> {
  loadDevelopmentEnv();
  await ensureTestUser();
  await ensureWorkspaceSubscriptionForE2E();
}
