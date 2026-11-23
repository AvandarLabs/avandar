import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { CaptureManifests } from "../../captureLib/CaptureManifests";
import { CaptureSanitization } from "../../captureLib/CaptureSanitization";
import { CaptureUrlSafety } from "../../captureLib/CaptureUrlSafety/CaptureUrlSafety";
import { createCheckpointRecorder } from "./createCheckpointRecorder";
import { createPersistedCaptureManifest } from "./createPersistedCaptureManifest";
import { createResourceRecorder } from "./createResourceRecorder";
import { createStepRecorder } from "./createStepRecorder";
import { makeCaptureManifestFromOptions } from "./makeCaptureManifestFromOptions";
import type { NetworkGuardEvent } from "../../captureLib/installNetworkGuard";
import type {
  CaptureContext,
  CaptureContextOptions,
  CaptureRecorderState,
} from "./createCaptureContext.types";

function _roundMs(value: number): number {
  return Math.round(value * 1000) / 1000;
}
/**
 * The shared run state: the manifest plus its clocks, URL scrubber, and
 * writer.
 */
function _createRecorderState(
  options: CaptureContextOptions,
): CaptureRecorderState {
  const manifest = makeCaptureManifestFromOptions(options);
  const manifestPath = join(options.runDir, "manifest.json");
  let writes = Promise.resolve();
  return {
    ...options,
    manifest,
    elapsed: () => {
      return _roundMs(performance.now() - options.startedAtMs);
    },
    videoElapsed: () => {
      return options.live.recordingOrigin === undefined
        ? undefined
        : _roundMs(performance.now() - options.live.recordingOrigin);
    },
    manifestUrl: (value) => {
      return CaptureSanitization.makeRedactedTextFromValue({
        value: CaptureUrlSafety.makeSourceUrlFromUrl(value),
        secrets: options.secrets.filter((secret) => {
          return secret.length >= 8;
        }),
      });
    },
    // Writes are queued so the file always ends at the latest manifest.
    persist: () => {
      writes = writes.then(() => {
        return CaptureManifests.writeManifest({
          path: manifestPath,
          manifest: createPersistedCaptureManifest(manifest),
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
function _createGuardReporter({
  run,
  requestListKey,
}: Readonly<{
  run: Readonly<CaptureRecorderState>;
  requestListKey: "blockedRequests" | "suppressedRequests";
}>): CaptureContext["reportBlocked"] {
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
    reportBlocked: _createGuardReporter({
      run,
      requestListKey: "blockedRequests",
    }),
    reportSuppressed: _createGuardReporter({
      run,
      requestListKey: "suppressedRequests",
    }),
    assertPolicy: run.assertPolicy,
    checkpoint: createCheckpointRecorder(run),
    step: createStepRecorder(run),
    recordResource: createResourceRecorder(run),
  };
}
