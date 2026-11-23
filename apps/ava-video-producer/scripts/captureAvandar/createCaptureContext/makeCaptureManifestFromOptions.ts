import { CaptureManifests } from "../../captureLib/CaptureManifests";
import type { CaptureManifest } from "../captureAvandar.types";
import type { CaptureContextOptions } from "./createCaptureContext.types";

/** The manifest sections every run starts empty, built fresh per run. */
function _createEmptyEvidence(): Pick<
  CaptureManifest,
  | "networkPolicy"
  | "timing"
  | "actions"
  | "checkpoints"
  | "resources"
  | "video"
  | "errors"
> {
  return {
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
    actions: [],
    checkpoints: [],
    resources: [],
    video: {
      status: "pending",
      originalFps: 25,
      fpsBasis: "Playwright native recorder, not a media probe",
      normalizationRequired: true,
      rawPath: undefined,
    },
    errors: [],
  };
}

/**
 * Builds the empty manifest a capture run starts from, recording the run's
 * inputs and one pending feature per flow. `createCaptureContext` calls it
 * once per run.
 */
export function makeCaptureManifestFromOptions(
  options: Readonly<CaptureContextOptions>,
): CaptureManifest {
  const { networkPolicy, timing, ...evidence } = _createEmptyEvidence();
  return {
    schemaVersion: 1,
    runId: CaptureManifests.getCaptureRunIdFromRunPath(options.runDir),
    status: "running",
    startedAt: new Date().toISOString(),
    inputs: {
      baseUrl: options.baseUrl,
      workspace: options.workspace,
      runLabel: options.runLabel,
      flowIds: options.flowIds,
      viewport: options.viewport,
      fixtureDir: options.fixtures.relativeDir,
      checkpointSettleMs: options.checkpointSettleMs,
    },
    fixtures: options.fixtures.files,
    browser: {
      engine: "chromium",
      version: undefined,
      playwrightVersion: options.playwrightVersion,
    },
    authentication: { status: "pending", recorded: false },
    // Keep the written key order: policy and timing come before features.
    networkPolicy,
    timing,
    features: options.flowIds.map((id) => {
      return { id, status: "pending" };
    }),
    ...evidence,
  };
}
