import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createRunDirectory,
  fixtureInventory,
  installNetworkGuard,
  isWorkspaceRoute,
  relativeArtifact,
  sanitizeText,
  sha256File,
  validateBaseUrl,
  validateId,
} from "../capture-lib.mjs";
import { requireLicense } from "../require-license.mjs";
import { CaptureRunError } from "./CaptureRunError.mjs";
import { createCaptureContext } from "./createCaptureContext.mjs";
import { loadFlows, loginViaUi } from "./loadFlows.mjs";

export { CaptureRunError } from "./CaptureRunError.mjs";
export { loadFlows } from "./loadFlows.mjs";

const DEFAULT_FLOWS = ["import", "explorer", "dashboards", "cases", "map"];
const require = createRequire(import.meta.url);

/**
 * Caller-supplied browsers remain caller-owned. All contexts here are isolated.
 * Flow callbacks are trusted local code and must operate through this page.
 */
export async function runCapture(options = {}) {
  const root = resolve(options.root ?? process.cwd());
  const baseUrl = validateBaseUrl(options.baseUrl ?? "http://localhost:5173");
  const workspace = validateId(
    options.workspace ?? "avandar-labs",
    "workspace",
  );
  const runLabel = validateId(options.runLabel ?? "harborfield", "runLabel");
  const flowIds = options.flowIds ?? DEFAULT_FLOWS;
  if (
    !Array.isArray(flowIds) ||
    !flowIds.length ||
    new Set(flowIds).size !== flowIds.length
  )
    throw new Error("flowIds must be a nonempty unique list");
  flowIds.forEach((id) => validateId(id, "flow id"));
  const flows = options.flowMap ?? (await loadFlows(root));
  for (const id of flowIds)
    if (typeof flows[id] !== "function")
      throw new Error(`Unknown capture flow: ${id}`);
  const viewport = options.viewport ?? { width: 1440, height: 900 };
  if (
    !Number.isInteger(viewport.width) ||
    !Number.isInteger(viewport.height) ||
    viewport.width < 800 ||
    viewport.height < 600 ||
    viewport.width > 3840 ||
    viewport.height > 2160
  )
    throw new Error(
      "Capture viewport must be integer pixels within 800×600 and 3840×2160",
    );
  const email =
    options.email ?? process.env.AVANDAR_DEMO_EMAIL ?? "user@avandarlabs.com";
  const password =
    options.password ?? process.env.AVANDAR_DEMO_PASSWORD ?? "avandar";
  if (
    typeof email !== "string" ||
    !email ||
    typeof password !== "string" ||
    !password
  )
    throw new Error("Capture login needs nonempty credentials");
  const secrets = [email, password];
  const timeout = options.actionTimeoutMs ?? 20_000;
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 120_000)
    throw new Error("actionTimeoutMs must be 1000 to 120000 milliseconds");
  const checkpointSettleMs = options.checkpointSettleMs ?? 600;
  if (
    !Number.isInteger(checkpointSettleMs) ||
    checkpointSettleMs < 0 ||
    checkpointSettleMs > 5000
  )
    throw new Error("checkpointSettleMs must be 0 to 5000 milliseconds");
  const fixtures = await fixtureInventory(
    root,
    options.fixtureDir ?? "demo-data",
    options.fixtureFiles,
  );
  const runDir = await createRunDirectory(root, runLabel);
  const started = performance.now();
  const live = { page: undefined, recordingOrigin: undefined };

  const {
    manifest,
    manifestPath,
    elapsed,
    videoElapsed,
    persist,
    reportBlocked,
    reportSuppressed,
    assertPolicy,
    checkpoint,
    step,
    recordResource,
  } = createCaptureContext({
    runDir,
    baseUrl,
    workspace,
    runLabel,
    flowIds,
    viewport,
    fixtures,
    checkpointSettleMs,
    secrets,
    email,
    playwrightVersion: require("@playwright/test/package.json").version,
    started,
    live,
  });
  await persist();

  let browser = options.browser;
  let ownsBrowser = false;
  let loginContext;
  let recordingContext;
  let video;
  let activeFeature;
  const state = Object.create(null);

  try {
    if (!browser) {
      const { chromium } = await import("@playwright/test");
      browser = await chromium.launch({ headless: true });
      ownsBrowser = true;
    }
    manifest.browser.version = browser.version();
    loginContext = await browser.newContext({
      viewport,
      serviceWorkers: "block",
    });
    loginContext.setDefaultTimeout(timeout);
    loginContext.setDefaultNavigationTimeout(Math.max(30_000, timeout));
    await installNetworkGuard(loginContext, reportBlocked, reportSuppressed);
    const loginPage = await loginContext.newPage();
    manifest.authentication.status = "running";
    await persist();
    await (options.login ?? loginViaUi)({
      page: loginPage,
      baseUrl,
      workspace,
      email,
      password,
    });
    assertPolicy();
    const authState = await loginContext.storageState();
    await loginContext.close();
    loginContext = undefined;
    manifest.authentication = {
      status: "passed",
      recorded: false,
      completedAtMs: elapsed(),
    };
    await mkdir(join(runDir, "raw"));
    await mkdir(join(runDir, "screens"));
    await mkdir(join(runDir, "text"));
    recordingContext = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      locale: "en-US",
      serviceWorkers: "block",
      storageState: authState,
      recordVideo: { dir: join(runDir, "raw"), size: viewport },
    });
    recordingContext.setDefaultTimeout(timeout);
    recordingContext.setDefaultNavigationTimeout(Math.max(30_000, timeout));
    await installNetworkGuard(
      recordingContext,
      reportBlocked,
      reportSuppressed,
    );
    live.recordingOrigin = performance.now();
    manifest.timing.recordingStartedAtMs = elapsed();
    live.page = await recordingContext.newPage();
    video = live.page.video();
    manifest.video.status = "recording";
    await live.page.goto(`${baseUrl}/${workspace}/`, {
      waitUntil: "domcontentloaded",
    });
    if (!isWorkspaceRoute(live.page.url(), baseUrl, workspace))
      throw new Error(
        "Authenticated recording context did not enter the requested workspace",
      );
    assertPolicy();

    for (const feature of manifest.features) {
      activeFeature = feature;
      feature.status = "running";
      feature.startedAtMs = elapsed();
      feature.videoStartedAtMs = videoElapsed();
      await persist();
      const context = {
        page: live.page,
        baseUrl,
        workspace,
        fixtureDir: fixtures.absoluteDir,
        runLabel,
        state,
        checkpoint: (id, checkpointOptions) =>
          checkpoint(feature.id, id, checkpointOptions),
        step: (id, action) => step(feature.id, id, action),
        recordResource: (resource) => recordResource(feature.id, resource),
      };
      await flows[feature.id](context);
      assertPolicy();
      if (
        manifest.actions.some(
          (action) =>
            action.flowId === feature.id && action.status === "failed",
        ) ||
        manifest.checkpoints.some(
          (shot) => shot.flowId === feature.id && shot.status === "failed",
        )
      ) {
        throw new Error(
          "A flow swallowed a failed action or checkpoint; the feature cannot pass",
        );
      }
      feature.status = "passed";
      feature.endedAtMs = elapsed();
      feature.videoEndedAtMs = videoElapsed();
      activeFeature = undefined;
      await persist();
    }
    manifest.status = "passed";
  } catch (error) {
    manifest.status = "failed";
    manifest.errors.push({
      stage:
        activeFeature?.id ??
        (manifest.authentication.status === "passed"
          ? "capture"
          : "authentication"),
      message: sanitizeText(error.message, secrets),
      atMs: elapsed(),
    });
    if (activeFeature) {
      activeFeature.status = "failed";
      activeFeature.endedAtMs = elapsed();
      activeFeature.videoEndedAtMs = videoElapsed();
    }
    if (manifest.authentication.status !== "passed")
      manifest.authentication.status = "failed";
    manifest.features.forEach((feature) => {
      if (feature.status === "pending") feature.status = "skipped";
    });
  } finally {
    const finalizeError = (stage, error) => {
      manifest.status = "failed";
      manifest.errors.push({
        stage,
        message: sanitizeText(error.message, secrets),
        atMs: elapsed(),
      });
    };
    if (loginContext) {
      try {
        await loginContext.close();
      } catch (error) {
        finalizeError("login-context-close", error);
      }
    }
    if (recordingContext) {
      try {
        // Finalize the stream first. saveAs() is never awaited on a live context.
        await recordingContext.close();
        if (!video)
          throw new Error("Recording context produced no video handle");
        const savedVideo = join(runDir, "capture.webm");
        await video.saveAs(savedVideo);
        manifest.video.status = "saved";
        manifest.video.path = relativeArtifact(runDir, savedVideo);
        manifest.video.sha256 = await sha256File(savedVideo);
        try {
          manifest.video.rawPath = relativeArtifact(runDir, await video.path());
        } catch {
          manifest.video.rawPath = null;
        }
      } catch (error) {
        manifest.video.status = "failed";
        finalizeError("video-finalization", error);
      }
    } else manifest.video.status = "not-recorded";
    if (ownsBrowser && browser) {
      try {
        await browser.close();
      } catch (error) {
        finalizeError("browser-close", error);
      }
    }
    // A guard rejection arriving during teardown must still invalidate the run.
    if (manifest.networkPolicy.blockedRequests.length)
      manifest.status = "failed";
    manifest.finishedAt = new Date().toISOString();
    manifest.durationMs = elapsed();
    await persist();
  }
  const result = { status: manifest.status, runDir, manifestPath, manifest };
  if (manifest.status !== "passed") throw new CaptureRunError(result);
  return result;
}

function parseArgs(args) {
  const options = {};
  const names = {
    "--base-url": "baseUrl",
    "--workspace": "workspace",
    "--run-label": "runLabel",
    "--fixture-dir": "fixtureDir",
    "--root": "root",
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help" || arg === "--list") {
      options[arg.slice(2)] = true;
      continue;
    }
    if (arg === "--flows" || names[arg]) {
      const value = args[++index];
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${arg}`);
      if (arg === "--flows") options.flowIds = value.split(",");
      else options[names[arg]] = value;
      continue;
    }
    throw new Error(`Unknown capture argument: ${arg}`);
  }
  return options;
}

async function main() {
  requireLicense();
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      "Usage: node scripts/capture-avandar/capture-avandar.mjs [--flows import,explorer,dashboards,cases,map] [--base-url http://localhost:5173] [--workspace avandar-labs] [--run-label harborfield] [--fixture-dir demo-data] [--root <repo>] [--list]",
    );
    return;
  }
  if (options.list) {
    const flows = await loadFlows(options.root ?? process.cwd());
    for (const id of Object.keys(flows)) console.log(validateId(id, "flow id"));
    return;
  }
  const result = await runCapture(options);
  console.log(`Capture ${result.status}: ${result.manifestPath}`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(
      sanitizeText(
        error.message,
        [
          process.env.AVANDAR_DEMO_EMAIL,
          process.env.AVANDAR_DEMO_PASSWORD,
        ].filter(Boolean),
      ),
    );
    process.exitCode = 1;
  });
}
