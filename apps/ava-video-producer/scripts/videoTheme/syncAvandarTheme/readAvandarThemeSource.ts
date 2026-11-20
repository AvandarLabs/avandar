import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { AvandarThemeSource } from "./createAvandarTheme/createAvandarTheme";

const APP_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

/**
 * The read-only Avandar theme's values, read through `readTheme.ts` so the
 * product runtime is never bundled. Used by `theme:sync-avandar` and by the
 * drift test that keeps `avandar.theme.json` current.
 */
export function readAvandarThemeSource(): AvandarThemeSource {
  return JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/readTheme.ts", "--for-video"],
      { cwd: APP_ROOT, encoding: "utf8" },
    ),
  ) as AvandarThemeSource;
}
