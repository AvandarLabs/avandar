import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { writeManifest } from "../../captureLib/manifestHelpers";
import { makeRedactedTextFromValue } from "../../captureLib/sanitizeHelpers";
import { makeSourceUrlFromUrl } from "../../captureLib/urlSafetyHelpers";
import { createCaptureManifest } from "./createCaptureManifest";
import { createCheckpointRecorder } from "./createCheckpointRecorder";
import { createResourceRecorder } from "./createResourceRecorder";
import { createStepRecorder } from "./createStepRecorder";
import type { NetworkGuardEvent } from "../../captureLib/installNetworkGuard";
import type {
  CaptureContext,
  CaptureContextOptions,
  CaptureRecorderState,
} from "./createCaptureContext.types";

/**
 * The shared run state: the manifest plus its clocks, URL scrubber, and
 * writer.
 */
function _createRecorderState(
  options: CaptureContextOptions,
): CaptureRecorderState {
  const manifest = createCaptureManifest(options);
  const manifestPath = join(options.runDir, "manifest.json");
  const roundMs = (value: number) => {
    return Math.round(value * 1000) / 1000;
  };
  let writes = Promise.resolve();
  return {
    ...options,
    manifest,
    elapsed: () => {
      return roundMs(performance.now() - options.startedAtMs);
    },
    videoElapsed: () => {
      return options.live.recordingOrigin === undefined
        ? null
        : roundMs(performance.now() - options.live.recordingOrigin);
    },
    manifestUrl: (value) => {
      return makeRedactedTextFromValue({
        value: makeSourceUrlFromUrl(value),
        secrets: options.secrets.filter((secret) => {
          return secret.length >= 8;
        }),
      });
    },
    // Writes are queued so the file always ends at the latest manifest.
    persist: () => {
      writes = writes.then(() => {
        return writeManifest({
          path: manifestPath,
          manifest,
          secrets: options.secrets,
        });
      });
      return writes;
    },
    assertPolicy: () => {
      if (manifest.networkPolicy.blockedRequests.length) {
        throw new Error(
          "Capture network policy blocked a request; inspect the manifest before using this recording",
        );
      }
    },
  };
}

function _createGuardReporter(
  run: Readonly<CaptureRecorderState>,
  requestListKey: "blockedRequests" | "suppressedRequests",
): CaptureContext["reportBlocked"] {
  return async (event: Readonly<NetworkGuardEvent>) => {
    run.manifest.networkPolicy[requestListKey].push({
      ...event,
      sourceUrl: run.manifestUrl(event.sourceUrl),
      atMs: run.elapsed(),
      videoAtMs: run.videoElapsed(),
    });
    await run.persist();
  };
}

/**
 * Builds a fresh capture manifest plus the `checkpoint`, `step`, and
 * `recordResource` recorders a run uses to record evidence against it.
 * `runCapture` mutates `live` as the run progresses (`live.page`,
 * `live.recordingOrigin`), so the recorders always see the current page and
 * video origin.
 */
export function createCaptureContext(
  options: Readonly<CaptureContextOptions>,
): CaptureContext {
  const run = _createRecorderState(options);
  return {
    manifest: run.manifest,
    manifestPath: join(options.runDir, "manifest.json"),
    elapsed: run.elapsed,
    videoElapsed: run.videoElapsed,
    manifestUrl: run.manifestUrl,
    persist: run.persist,
    reportBlocked: _createGuardReporter(run, "blockedRequests"),
    reportSuppressed: _createGuardReporter(run, "suppressedRequests"),
    assertPolicy: run.assertPolicy,
    checkpoint: createCheckpointRecorder(run),
    step: createStepRecorder(run),
    recordResource: createResourceRecorder(run),
  };
}
