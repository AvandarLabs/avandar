import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  assertSafeManifest,
  captureRunId,
  relativeArtifact,
  sanitizeText,
  sha256File,
  sourceUrl,
  validateId,
  writeManifest,
} from "../capture-lib.mjs";

/** @typedef {{path: string, sha256: string}} CaptureArtifact */
/** @typedef {{id: string, flowId: string, status: string, sourceUrl: string, startedAtMs: number, videoStartedAtMs: number|null, endedAtMs?: number, videoEndedAtMs?: number|null, resultUrl?: string, error?: string}} CaptureAction */
/** @typedef {{id: string, flowId: string, status: string, sourceUrl: string, startedAtMs: number, atMs?: number, videoAtMs?: number|null, completedAtMs?: number, screenshot?: CaptureArtifact, text?: CaptureArtifact, error?: string}} CaptureCheckpoint */
/** @typedef {{id: string, status: string, startedAtMs?: number, endedAtMs?: number, videoStartedAtMs?: number|null, videoEndedAtMs?: number|null}} CaptureFeature */
/** @typedef {{sourceUrl: string, method: string, reason: string, atMs: number, videoAtMs: number|null}} BlockedRequest */
/**
 * @typedef {object} CaptureManifest
 * @property {number} schemaVersion
 * @property {string} runId
 * @property {string} status
 * @property {string} startedAt
 * @property {{baseUrl: string, workspace: string, runLabel: string, flowIds: string[], viewport: {width: number,height: number}, fixtureDir: string, checkpointSettleMs: number}} inputs
 * @property {{path: string, bytes: number, sha256: string}[]} fixtures
 * @property {{engine: string, version: string|null, playwrightVersion: string}} browser
 * @property {{status: string, recorded: boolean, completedAtMs?: number}} authentication
 * @property {{scope: string, serviceWorkers: string, blockedRequests: BlockedRequest[], suppressedRequests: BlockedRequest[]}} networkPolicy
 * @property {{unit: string, clock: string, recordingOrigin: string, exactFrameAlignment: boolean, recordingStartedAtMs?: number}} timing
 * @property {CaptureFeature[]} features
 * @property {CaptureAction[]} actions
 * @property {CaptureCheckpoint[]} checkpoints
 * @property {{flowId: string, kind: string, id: string, name: string}[]} resources
 * @property {{status: string, originalFps: number, fpsBasis: string, normalizationRequired: boolean, rawPath: string|null, path?: string, sha256?: string}} video
 * @property {{stage: string, message: string, atMs: number}[]} errors
 * @property {string} [finishedAt]
 * @property {number} [durationMs]
 */
/** @typedef {{status: string, runDir: string, manifestPath: string, manifest: CaptureManifest}} CaptureResult */

/**
 * Build a fresh capture manifest plus the `checkpoint`/`step`/`recordResource`
 * closures a run uses to record evidence against it. `live` is a plain object
 * the caller mutates as the run progresses (`live.page`, `live.recordingOrigin`),
 * so these closures always see the current page and video origin.
 */
export function createCaptureContext({
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
  playwrightVersion,
  started,
  live,
}) {
  const manifestPath = join(runDir, "manifest.json");
  const elapsed = () => Math.round((performance.now() - started) * 1000) / 1000;
  const videoElapsed = () =>
    live.recordingOrigin === undefined
      ? null
      : Math.round((performance.now() - live.recordingOrigin) * 1000) / 1000;
  const manifestUrl = (value) =>
    sanitizeText(
      sourceUrl(value),
      secrets.filter((secret) => secret.length >= 8),
    );

  /** @type {CaptureManifest} */
  const manifest = {
    schemaVersion: 1,
    runId: captureRunId(runDir),
    status: "running",
    startedAt: new Date().toISOString(),
    inputs: {
      baseUrl,
      workspace,
      runLabel,
      flowIds,
      viewport,
      fixtureDir: fixtures.relativeDir,
      checkpointSettleMs,
    },
    fixtures: fixtures.files,
    browser: {
      engine: "chromium",
      version: null,
      playwrightVersion,
    },
    authentication: { status: "pending", recorded: false },
    networkPolicy: {
      scope: "loopback-with-readonly-external-assets",
      serviceWorkers: "blocked",
      blockedRequests: [],
      suppressedRequests: [],
    },
    timing: {
      unit: "milliseconds",
      clock: "monotonic-performance-now",
      recordingOrigin: "immediately-before-recording-page-creation",
      exactFrameAlignment: false,
    },
    features: flowIds.map((id) => ({ id, status: "pending" })),
    actions: [],
    checkpoints: [],
    resources: [],
    video: {
      status: "pending",
      originalFps: 25,
      fpsBasis: "Playwright native recorder, not a media probe",
      normalizationRequired: true,
      rawPath: null,
    },
    errors: [],
  };

  let writes = Promise.resolve();
  const persist = () => {
    writes = writes.then(() => writeManifest(manifestPath, manifest, secrets));
    return writes;
  };

  const reportBlocked = async (event) => {
    manifest.networkPolicy.blockedRequests.push({
      ...event,
      sourceUrl: manifestUrl(event.sourceUrl),
      atMs: elapsed(),
      videoAtMs: videoElapsed(),
    });
    await persist();
  };
  const reportSuppressed = async (event) => {
    manifest.networkPolicy.suppressedRequests.push({
      ...event,
      sourceUrl: manifestUrl(event.sourceUrl),
      atMs: elapsed(),
      videoAtMs: videoElapsed(),
    });
    await persist();
  };
  const assertPolicy = () => {
    if (manifest.networkPolicy.blockedRequests.length)
      throw new Error(
        "Capture network policy blocked a request; inspect the manifest before using this recording",
      );
  };

  const actionIds = new Set();
  const checkpointIds = new Set();

  const checkpoint = async (flowId, id, checkpointOptions = {}) => {
    validateId(id, "checkpoint id");
    const qualified = `${flowId}-${id}`;
    if (checkpointIds.has(qualified))
      throw new Error(`Duplicate checkpoint: ${qualified}`);
    checkpointIds.add(qualified);
    assertPolicy();
    const { page } = live;
    const entry = {
      id,
      flowId,
      status: "running",
      sourceUrl: manifestUrl(page.url()),
      startedAtMs: elapsed(),
    };
    manifest.checkpoints.push(entry);
    await persist();
    try {
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      if (checkpointSettleMs) await page.waitForTimeout(checkpointSettleMs);
      entry.sourceUrl = manifestUrl(page.url());
      entry.atMs = elapsed();
      entry.videoAtMs = videoElapsed();
      const imagePath = join(runDir, "screens", `${qualified}.png`);
      await page.screenshot({
        path: imagePath,
        fullPage: false,
        animations: "disabled",
        mask: [
          page.locator(
            'input[type="password"],input[type="email"],[autocomplete="current-password"],[autocomplete="new-password"]',
          ),
          page.getByText(email, { exact: true }),
        ],
      });
      entry.screenshot = {
        path: relativeArtifact(runDir, imagePath),
        sha256: await sha256File(imagePath),
      };
      if (checkpointOptions.text === true) {
        const textPath = join(runDir, "text", `${qualified}.txt`);
        const visibleText = await page.locator("body").innerText();
        await writeFile(
          textPath,
          `${sanitizeText(visibleText, secrets, 50_000)}\n`,
          { flag: "wx", mode: 0o600 },
        );
        entry.text = {
          path: relativeArtifact(runDir, textPath),
          sha256: await sha256File(textPath),
        };
      }
      entry.status = "passed";
      entry.completedAtMs = elapsed();
      await persist();
      return entry.screenshot.path;
    } catch (error) {
      entry.status = "failed";
      entry.error = sanitizeText(error.message, secrets);
      await persist();
      throw error;
    }
  };

  const step = async (flowId, id, action) => {
    validateId(id, "step id");
    if (typeof action !== "function")
      throw new Error("step needs an action callback");
    const qualified = `${flowId}-${id}`;
    if (actionIds.has(qualified))
      throw new Error(`Duplicate step: ${qualified}`);
    actionIds.add(qualified);
    assertPolicy();
    const { page } = live;
    const event = {
      id,
      flowId,
      status: "running",
      sourceUrl: manifestUrl(page.url()),
      startedAtMs: elapsed(),
      videoStartedAtMs: videoElapsed(),
    };
    manifest.actions.push(event);
    await persist();
    try {
      const result = await action();
      assertPolicy();
      event.status = "passed";
      return result;
    } catch (error) {
      event.status = "failed";
      event.error = sanitizeText(error.message, secrets);
      throw error;
    } finally {
      event.endedAtMs = elapsed();
      event.videoEndedAtMs = videoElapsed();
      event.resultUrl = manifestUrl(live.page.url());
      await persist();
    }
  };

  const recordResource = async (flowId, { kind, id, name }) => {
    validateId(kind, "resource kind");
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id))
      throw new Error("Resource id must be a plain identifier");
    const resource = {
      flowId,
      kind,
      id,
      name: sanitizeText(name ?? "", secrets, 160),
    };
    assertSafeManifest(resource, secrets);
    manifest.resources.push(resource);
    await persist();
    return resource;
  };

  return {
    manifest,
    manifestPath,
    elapsed,
    videoElapsed,
    manifestUrl,
    persist,
    reportBlocked,
    reportSuppressed,
    assertPolicy,
    checkpoint,
    step,
    recordResource,
  };
}
