import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const YELLOW = "\x1b[33m";
const PRODUCTION_ENV_FILENAME = ".env.production";

/**
 * Loads the production environment variables from the .env.production file.
 * Any existing environment variables that share the same key will be
 * overridden.
 *
 * This should only be used when running scripts need to access production
 * infrastructure, such as Supabase.
 */
export function loadProductionEnv(): void {
  const envPath: string = path.resolve(PRODUCTION_ENV_FILENAME);
  if (!existsSync(envPath)) {
    throw new Error(`${RED}❌ .env.production does not exist.${RESET}`);
  }

  const envFileContent: string = readFileSync(envPath, "utf8");
  const prodEnvVars: Record<string, string> = dotenv.parse(envFileContent);
  console.log(
    `${YELLOW}⚠️  Loaded PRODUCTION environment variables ⚠️${RESET}`,
  );

  Object.keys(prodEnvVars).forEach((key) => {
    delete process.env[key];
    process.env[key] = prodEnvVars[key];
  });
}
