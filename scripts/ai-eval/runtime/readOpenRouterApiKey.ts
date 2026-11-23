import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The OpenRouter key for eval runs: `OPEN_ROUTER_API_KEY` from the
 * environment, else from the repo's `.env.development.edge`.
 */
export function readOpenRouterApiKey(repoRoot: string): string {
  if (process.env.OPEN_ROUTER_API_KEY) {
    return process.env.OPEN_ROUTER_API_KEY;
  }
  const envText = readFileSync(join(repoRoot, ".env.development.edge"), "utf8");
  const line = envText.split("\n").find((envLine) => {
    return envLine.startsWith("OPEN_ROUTER_API_KEY=");
  });
  const key = line
    ?.slice("OPEN_ROUTER_API_KEY=".length)
    .replaceAll('"', "")
    .trim();
  if (!key) {
    throw new Error("OPEN_ROUTER_API_KEY is not set");
  }
  return key;
}
