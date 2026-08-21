import { execFileSync } from "node:child_process";

/** How long the probe waits before deciding nothing is listening. */
const PROBE_TIMEOUT_MS = 1_000;

/** The message shown when the port the run needs is already taken. */
export function getPortInUseMessage(port: number): string {
  return [
    "",
    `A server is already listening on port ${port}, so the E2E run cannot`,
    "start its own.",
    "",
    "The E2E server is not interchangeable with a dev server: it is started",
    "with `enable-shared-with-me` and `VITE_OFFLINE_CHAT_MOCK=true`, which a",
    "`pnpm dev` server never has. Reusing one would not fail loudly, it would",
    "run the share and chat specs against an app configured differently from",
    "the one they describe.",
    "",
    "Stop the other server first, then re-run. To find it:",
    `  lsof -ti:${port}`,
    "",
  ].join("\n");
}

/**
 * A child process that exits non-zero when something answers on `port`.
 *
 * Node has no synchronous TCP connect, and this has to be synchronous: the
 * only moment early enough to check is while the config module is evaluating,
 * because Playwright starts `webServer` before `globalSetup` runs. Checking
 * from `globalSetup` finds the run's *own* Vite on the port and fails every
 * time.
 */
const PROBE_SOURCE = `
const net = require("node:net");
const socket = net.connect(Number(process.argv[1]), "127.0.0.1");
const exit = (code) => {
  socket.destroy();
  process.exit(code);
};
socket.setTimeout(${PROBE_TIMEOUT_MS});
socket.on("connect", () => { exit(1); });
socket.on("timeout", () => { exit(0); });
socket.on("error", () => { exit(0); });
`;

/**
 * True inside a Playwright worker rather than the process that starts the run.
 *
 * Playwright evaluates the config once in the runner and again in every
 * worker, and the workers start *after* `webServer` is up. Without this the
 * second evaluation finds the run's own Vite on the port and fails the run it
 * is part of.
 */
function _isPlaywrightWorkerProcess(): boolean {
  return process.env.TEST_WORKER_INDEX !== undefined;
}

/**
 * Fails the run when the E2E server's port is already taken.
 *
 * Playwright's own message for this ("http://… is already used, make sure
 * that nothing is running on the port/url or set reuseExistingServer:true")
 * recommends a fix that is wrong here, and never says which process to stop.
 */
export function assertE2EDevServerPortIsFree(port: number): void {
  if (_isPlaywrightWorkerProcess()) {
    return;
  }
  try {
    execFileSync(process.execPath, ["-e", PROBE_SOURCE, String(port)], {
      stdio: "ignore",
    });
  } catch {
    throw new Error(getPortInUseMessage(port));
  }
}

/** The message shown when the local Supabase stack is not answering. */
export function getSupabaseDownMessage(url: string): string {
  return [
    "",
    `The local Supabase API at ${url} is not answering, so the E2E run has`,
    "no database, no auth and no Edge Functions to test against.",
    "",
    "Unlike the app servers, this one is not started for you: it owns your",
    "local data, so starting or resetting it is your call.",
    "",
    "Start it with:",
    "  supabase start",
    "",
  ].join("\n");
}

/** Probe source for one HTTP GET; exits non-zero when the URL is not OK. */
const HTTP_PROBE_SOURCE = `
const url = process.argv[1];
const timeout = setTimeout(() => { process.exit(1); }, ${PROBE_TIMEOUT_MS * 5});
fetch(url)
  .then((response) => {
    clearTimeout(timeout);
    process.exit(response.ok ? 0 : 1);
  })
  .catch(() => {
    clearTimeout(timeout);
    process.exit(1);
  });
`;

/**
 * Fails the run when the local Supabase API is down.
 *
 * Checked here for the same reason as the port: by the time a spec fails on a
 * 503 from `validate-slug`, the run has spent minutes and reports a dozen
 * unrelated-looking failures rather than the one fact that explains them.
 */
export function assertSupabaseApiIsRunning(url: string): void {
  if (_isPlaywrightWorkerProcess()) {
    return;
  }
  try {
    execFileSync(process.execPath, ["-e", HTTP_PROBE_SOURCE, url], {
      stdio: "ignore",
    });
  } catch {
    throw new Error(getSupabaseDownMessage(url));
  }
}
