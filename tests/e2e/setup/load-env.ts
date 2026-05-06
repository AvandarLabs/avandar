import path from "node:path";
import { config } from "dotenv";

/**
 * Loads `.env.development` from the repository root so global setup and the
 * Playwright config can read `VITE_*` and `SUPABASE_*` values.
 */
export function loadDevelopmentEnv(): void {
  config({ path: path.resolve(process.cwd(), ".env.development") });
}
