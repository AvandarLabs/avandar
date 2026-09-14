/**
 * Runs `playwright test`, after taking the arguments Playwright does not have.
 *
 * Only `--no-third-party` so far: it drops the `@third-party` specs from the
 * run instead of letting each decide by whether its credentials are present.
 * Playwright's CLI rejects options it does not define, so the flag is consumed
 * here and handed to `playwright.config.ts` as an environment variable. Every
 * other argument is passed through untouched, so `pnpm test:e2e <spec>`,
 * `--grep`, `--headed` and the rest keep working.
 *
 * Run through `pnpm vite-script`, like every other `.ts` script here.
 */
import { spawn } from "node:child_process";
import { E2E_NO_THIRD_PARTY_FLAG } from "../../tests/e2e/setup/E2eThirdPartyMode/E2eThirdPartyMode";

const args = process.argv.slice(2);
const isNoThirdParty = args.includes(E2E_NO_THIRD_PARTY_FLAG);
const playwrightArgs = args.filter((arg) => {
  return arg !== E2E_NO_THIRD_PARTY_FLAG;
});

const child = spawn("playwright", ["test", ...playwrightArgs], {
  stdio: "inherit",
  env: isNoThirdParty
    ? { ...process.env, PLAYWRIGHT_E2E_NO_THIRD_PARTY: "1" }
    : process.env,
});

child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
  // A signalled child leaves `code` null, and exiting 0 there would report a
  // killed run as a passing one.
  process.exit(signal ? 1 : (code ?? 1));
});

child.on("error", (error: Error) => {
  console.error(`Could not start Playwright: ${error.message}`);
  process.exit(1);
});
