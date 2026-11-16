import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  createRunDirectory,
  makeFixtureInventoryFromDirectory,
} from "../captureLib/fsSafetyHelpers";
import { installNetworkGuard } from "../captureLib/installNetworkGuard";
import { isWorkspaceRoute } from "../captureLib/urlSafetyHelpers";
import { CaptureRunError } from "./CaptureRunError";
import { createCaptureContext } from "./createCaptureContext/createCaptureContext";
import { finalizeCapture } from "./finalizeCapture";
import { loginViaUi } from "./loginViaUi";
import { readCaptureSettings } from "./readCaptureSettings";
import { recordCaptureFailure } from "./recordCaptureFailure";
import type { FixtureInventory } from "../captureLib/fsSafetyHelpers";
import type {
  CaptureFeature,
  CaptureOptions,
  CaptureResult,
  LiveCapture,
} from "./captureAvandar.types";
import type {
  CaptureRun,
  CaptureSession,
  CaptureSettings,
} from "./captureRun.types";
import type { Browser, BrowserContext } from "@playwright/test";

const require = createRequire(import.meta.url);

/** What one flow runs against: its feature, shared state, and fixtures. */
type RunFeatureOptions = {
  run: CaptureRun;
  feature: CaptureFeature;
  state: Record<string, unknown>;
  fixtureDir: string;
};

function _setTimeouts(context: BrowserContext, timeout: number): void {
  context.setDefaultTimeout(timeout);
  context.setDefaultNavigationTimeout(Math.max(30_000, timeout));
}

/** Logs in through an unrecorded context and returns its storage state. */
async function _logIn({
  run,
  captureOptions,
  browser,
}: Readonly<{
  run: CaptureRun;
  captureOptions: Readonly<CaptureOptions>;
  browser: Browser;
}>): Promise<Awaited<ReturnType<BrowserContext["storageState"]>>> {
  const { settings, context, session } = run;
  session.loginContext = await browser.newContext({
    viewport: settings.viewport,
    serviceWorkers: "block",
  });
  _setTimeouts(session.loginContext, settings.timeout);
  await installNetworkGuard({
    context: session.loginContext,
    onBlocked: context.reportBlocked,
    onSuppressed: context.reportSuppressed,
  });
  const loginPage = await session.loginContext.newPage();
  context.manifest.authentication.status = "running";
  await context.persist();
  await (captureOptions.login ?? loginViaUi)({
    page: loginPage,
    baseUrl: settings.baseUrl,
    workspace: settings.workspace,
    email: settings.email,
    password: settings.password,
  });
  context.assertPolicy();
  const authState = await session.loginContext.storageState();
  await session.loginContext.close();
  session.loginContext = undefined;
  context.manifest.authentication = {
    status: "passed",
    recorded: false,
    completedAtMs: context.elapsed(),
  };
  return authState;
}

/** Throws unless a page URL sits inside the workspace being captured. */
function _assertEnteredWorkspace(
  url: string,
  settings: Readonly<CaptureSettings>,
): void {
  if (
    !isWorkspaceRoute({
      url,
      baseUrl: settings.baseUrl,
      workspace: settings.workspace,
    })
  ) {
    throw new Error(
      "Authenticated recording context did not enter the requested workspace",
    );
  }
}

/**
 * Opens the recording context with the login's state and enters the
 * workspace.
 */
async function _startRecording({
  run,
  browser,
  authState,
}: Readonly<{
  run: CaptureRun;
  browser: Browser;
  authState: Awaited<ReturnType<BrowserContext["storageState"]>>;
}>): Promise<void> {
  const { settings, context, session, live, runDir } = run;
  await Promise.all(
    ["raw", "screens", "text"].map((folder) => mkdir(join(runDir, folder))),
  );
  session.recordingContext = await browser.newContext({
    viewport: settings.viewport,
    deviceScaleFactor: 1,
    locale: "en-US",
    serviceWorkers: "block",
    storageState: authState,
    recordVideo: { dir: join(runDir, "raw"), size: settings.viewport },
  });
  _setTimeouts(session.recordingContext, settings.timeout);
  await installNetworkGuard({
    context: session.recordingContext,
    onBlocked: context.reportBlocked,
    onSuppressed: context.reportSuppressed,
  });
  live.recordingOrigin = performance.now();
  context.manifest.timing.recordingStartedAtMs = context.elapsed();
  live.page = await session.recordingContext.newPage();
  session.video = live.page.video() ?? undefined;
  context.manifest.video.status = "recording";
  await live.page.goto(`${settings.baseUrl}/${settings.workspace}/`, {
    waitUntil: "domcontentloaded",
  });
  _assertEnteredWorkspace(live.page.url(), settings);
  context.assertPolicy();
}

/** Whether a flow recorded a failed action or checkpoint it then swallowed. */
function _hasSwallowedFailure(
  context: CaptureRun["context"],
  flowId: string,
): boolean {
  return (
    context.manifest.actions.some(
      (action) => action.flowId === flowId && action.status === "failed",
    ) ||
    context.manifest.checkpoints.some(
      (shot) => shot.flowId === flowId && shot.status === "failed",
    )
  );
}

/** Runs one flow against the recording page and marks its feature passed. */
async function _runFeature({
  run,
  feature,
  state,
  fixtureDir,
}: Readonly<RunFeatureOptions>): Promise<void> {
  const { settings, context, session, live } = run;
  session.activeFeature = feature;
  feature.status = "running";
  feature.startedAtMs = context.elapsed();
  feature.videoStartedAtMs = context.videoElapsed();
  await context.persist();
  if (!live.page) {
    throw new Error("Capture flows need the recording page");
  }
  await settings.flows[feature.id]({
    page: live.page,
    baseUrl: settings.baseUrl,
    workspace: settings.workspace,
    fixtureDir,
    runLabel: settings.runLabel,
    state,
    checkpoint: (id, options) =>
      context.checkpoint({
        flowId: feature.id,
        id,
        checkpointOptions: options,
      }),
    step: (id, action) => context.step({ flowId: feature.id, id, action }),
    recordResource: (resource) => context.recordResource(feature.id, resource),
  });
  context.assertPolicy();
  if (_hasSwallowedFailure(context, feature.id)) {
    throw new Error(
      "A flow swallowed a failed action or checkpoint; the feature cannot pass",
    );
  }
  feature.status = "passed";
  feature.endedAtMs = context.elapsed();
  feature.videoEndedAtMs = context.videoElapsed();
  session.activeFeature = undefined;
  await context.persist();
}

/** Launches a browser when needed, logs in, records, and runs every flow. */
async function _recordCapture({
  run,
  captureOptions,
  fixtureDir,
}: Readonly<{
  run: CaptureRun;
  captureOptions: Readonly<CaptureOptions>;
  fixtureDir: string;
}>): Promise<void> {
  const { session, context } = run;
  if (!session.browser) {
    const { chromium } = await import("@playwright/test");
    session.browser = await chromium.launch({ headless: true });
    session.ownsBrowser = true;
  }
  context.manifest.browser.version = session.browser.version();
  const authState = await _logIn({
    run,
    captureOptions,
    browser: session.browser,
  });
  await _startRecording({ run, browser: session.browser, authState });
  const state: Record<string, unknown> = Object.create(null);
  // Flows share one page and one state object, so they run in order.
  for (const feature of context.manifest.features) {
    await _runFeature({ run, feature, state, fixtureDir });
  }
  context.manifest.status = "passed";
}

/** Prepares the run folder, fixture inventory, and evidence recorders. */
async function _createRun(
  settings: CaptureSettings,
  options: Readonly<CaptureOptions>,
): Promise<{ run: CaptureRun; fixtures: FixtureInventory }> {
  const fixtures = await makeFixtureInventoryFromDirectory({
    rootPath: settings.root,
    fixtureDir: options.fixtureDir ?? "demo-data",
    fixtureFiles: options.fixtureFiles,
  });
  const runDir = await createRunDirectory({
    rootPath: settings.root,
    runLabel: settings.runLabel,
  });
  const live: LiveCapture = { page: undefined, recordingOrigin: undefined };
  const secrets = [settings.email, settings.password];
  const context = createCaptureContext({
    ...settings,
    runDir,
    fixtures,
    secrets,
    playwrightVersion: require("@playwright/test/package.json").version,
    startedAtMs: performance.now(),
    live,
  });
  const session: CaptureSession = {
    browser: options.browser,
    ownsBrowser: false,
    loginContext: undefined,
    recordingContext: undefined,
    video: undefined,
    activeFeature: undefined,
  };
  return {
    run: { settings, context, session, live, runDir, secrets },
    fixtures,
  };
}

/**
 * Records the requested capture flows against the local Avandar app: logs in
 * through an unrecorded context, records each flow's evidence, and writes a
 * manifest. Throws `CaptureRunError` when the run does not pass.
 * Caller-supplied browsers remain caller-owned, and all contexts here are
 * isolated. Flow callbacks are trusted local code and must operate through
 * the page they receive.
 */
export async function runCapture(
  options: Readonly<CaptureOptions> = {},
): Promise<CaptureResult> {
  const settings = await readCaptureSettings(options);
  const { run, fixtures } = await _createRun(settings, options);
  await run.context.persist();
  try {
    await _recordCapture({
      run,
      captureOptions: options,
      fixtureDir: fixtures.absoluteDir,
    });
  } catch (error) {
    recordCaptureFailure(run, error);
  } finally {
    await finalizeCapture(run);
  }
  const { manifest, manifestPath } = run.context;
  const result = {
    status: manifest.status,
    runDir: run.runDir,
    manifestPath,
    manifest,
  };
  if (manifest.status !== "passed") {
    throw new CaptureRunError(result);
  }
  return result;
}
