import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const YELLOW = "\x1b[33m";
const PRODUCTION_ENV_FILENAME = ".env.production";

/**
 * Gets the production environment variables from the .env.production file.
 * This should only be used when running scripts that need to access production
 * infrastructure, such as Supabase.
 *
 * @returns The production environment variables
 */
export function getProductionEnv(): Record<string, string> {
  const abs: string = path.resolve(PRODUCTION_ENV_FILENAME);
  if (!existsSync(abs)) {
    throw new Error(`${RED}❌ .env.production does not exist.${RESET}`);
  }

  const content: string = readFileSync(abs, "utf8");
  const parsed: Record<string, string> = dotenv.parse(content);
  console.log(`${YELLOW}⚠️ Loaded PRODUCTION environment variables ⚠️${RESET}`);
  return parsed;
}
