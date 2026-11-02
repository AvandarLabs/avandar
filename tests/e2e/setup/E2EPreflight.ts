import { execFileSync } from "node:child_process";

/** How long a TCP probe waits before deciding nothing is listening. */
const PORT_PROBE_TIMEOUT_MS = 1_000;

/** How long one HTTP probe attempt waits for a response. */
const HTTP_PROBE_TIMEOUT_MS = 5_000;

/**
 * How many times the HTTP probe retries before reporting the API down.
 *
 * A local Supabase stack answers a few seconds after `supabase start`, so a
 * single-shot probe reports a warming stack as a missing one. Kept short
 * because the common failure is a stack that was never started, and that
 * should say so rather than sit silent for a minute.
 */
const HTTP_PROBE_ATTEMPTS = 5;

/** How long the HTTP probe waits between attempts. */
const HTTP_PROBE_RETRY_DELAY_MS = 1_000;

/**
 * Probe source for one TCP connect; exits non-zero when something answers.
 *
 * It is a separate script because Node has no synchronous TCP connect and
 * these checks have to be synchronous.
 */
const PORT_PROBE_SOURCE = `
const net = require("node:net");
const socket = net.connect(Number(process.argv[2]), process.argv[1]);
const exit = (code) => {
  socket.destroy();
  process.exit(code);
};
socket.setTimeout(${PORT_PROBE_TIMEOUT_MS});
socket.on("connect", () => { exit(1); });
socket.on("timeout", () => { exit(0); });
socket.on("error", () => { exit(0); });
`;

/** Probe source for one HTTP GET; exits non-zero when the URL is not OK. */
const HTTP_PROBE_SOURCE = `
const url = process.argv[1];
const attempt = async (remainingAttempts) => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(${HTTP_PROBE_TIMEOUT_MS}),
    });
    if (response.ok) {
      return 0;
    }
  } catch {}
  if (remainingAttempts <= 1) {
    return 1;
  }
  await new Promise((resolve) => {
    setTimeout(resolve, ${HTTP_PROBE_RETRY_DELAY_MS});
  });
  return attempt(remainingAttempts - 1);
};
attempt(${HTTP_PROBE_ATTEMPTS}).then((code) => { process.exit(code); });
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

function _getPortInUseMessage(
  options: Readonly<{ host: string; port: number }>,
): string {
  return [
    "",
    `A server is already listening on ${options.host}:${options.port}, so the`,
    "E2E run cannot start its own.",
    "",
    "The E2E server is not interchangeable with a dev server: it is started",
    "with `enable-shared-with-me` and `VITE_OFFLINE_CHAT_MOCK=true`, which a",
    "`pnpm dev` server never has. Reusing one would not fail loudly, it would",
    "run the share and chat specs against an app configured differently from",
    "the one they describe.",
    "",
    "Stop the other server first, then re-run. To find it:",
    `  lsof -ti:${options.port}`,
    "",
  ].join("\n");
}

function _getSupabaseDownMessage(url: string): string {
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

/**
 * Runs one probe script and throws its failure message on a non-zero exit.
 *
 * Probes run in a child process because they have to be synchronous, and
 * nothing in the run has started yet, so a throw here is the only way to stop
 * it before Playwright spends minutes on doomed specs.
 */
function _assertProbeSucceeds(
  options: Readonly<{
    failureMessage: string;
    probeArguments: readonly string[];
    probeSource: string;
  }>,
): void {
  if (_isPlaywrightWorkerProcess()) {
    return;
  }
  try {
    execFileSync(
      process.execPath,
      ["-e", options.probeSource, ...options.probeArguments],
      { stdio: "ignore" },
    );
  } catch {
    throw new Error(options.failureMessage);
  }
}

/**
 * The checks that must hold before Playwright starts an E2E run, each failing
 * the run with an actionable message instead of letting the suite discover the
 * problem one timing-out spec at a time.
 *
 * Call these from `playwright.config.ts` while the config is still evaluating.
 * That is the last moment before `webServer` starts, and by `globalSetup` the
 * run's own Vite already holds the port, so the port check would fail every
 * run.
 */
export const E2EPreflight = {
  /**
   * Fails the run when the E2E server's port is already taken.
   *
   * Playwright's own message for this ("http://… is already used, make sure
   * that nothing is running on the port/url or set reuseExistingServer:true")
   * recommends a fix that is wrong here, and never says which process to stop.
   */
  assertDevServerPortIsFree: (
    options: Readonly<{ host: string; port: number }>,
  ): void => {
    _assertProbeSucceeds({
      failureMessage: _getPortInUseMessage(options),
      probeArguments: [options.host, String(options.port)],
      probeSource: PORT_PROBE_SOURCE,
    });
  },

  /**
   * Fails the run when the local Supabase REST API is not reachable, which is
   * the case where the stack was never started.
   *
   * Scoped to that: it probes PostgREST, and Kong keeps answering there when
   * the Edge Functions runtime dies. The readiness check for that is the
   * `fns:serve` entry's `healthz` URL in `playwright.config.ts`.
   */
  assertSupabaseApiIsRunning: (url: string): void => {
    _assertProbeSucceeds({
      failureMessage: _getSupabaseDownMessage(url),
      probeArguments: [url],
      probeSource: HTTP_PROBE_SOURCE,
    });
  },
};
