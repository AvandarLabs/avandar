import { propEq } from "@avandar/utils";
import { CaptureSanitization } from "../captureLib/CaptureSanitization";
import type { CaptureRun } from "./captureRun.types";
/**
 * Marks a run, its active feature, and its remaining features failed, and
 * records the redacted error. `runCapture` calls it when a flow or the login
 * throws.
 */
export function recordCaptureFailure({
  run,
  error,
}: Readonly<{
  run: CaptureRun;
  error: unknown;
}>): void {
  const { manifest, elapsed, videoElapsed } = run.context;
  const { activeFeature } = run.session;
  manifest.status = "failed";
  manifest.errors.push({
    stage:
      activeFeature?.id ??
      (manifest.authentication.status === "passed"
        ? "capture"
        : "authentication"),
    message: CaptureSanitization.makeRedactedTextFromValue({
      value: error instanceof Error ? error.message : error,
      secrets: run.secrets,
    }),
    atMs: elapsed(),
  });
  if (activeFeature) {
    activeFeature.status = "failed";
    activeFeature.endedAtMs = elapsed();
    activeFeature.videoEndedAtMs = videoElapsed();
  }
  if (manifest.authentication.status !== "passed") {
    manifest.authentication.status = "failed";
  }
  manifest.features.filter(propEq("status", "pending")).forEach((feature) => {
    feature.status = "skipped";
  });
}
